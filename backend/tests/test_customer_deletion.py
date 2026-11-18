import json
from hashlib import sha256
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.modules.leads.customer_deletion import (
    CustomerDeletionConflict, delete_customer, deletion_preview, restore_customer,
)
from app.modules.leads.customer_router import router
from app.modules.leads.customers import list_customers, sync_customer_estimate, upsert_customer
from app.modules.leads.router import router as leads_router

ADMIN = {"X-BOM-Admin-Token": "deletion-test-admin"}
BASE = "/api/v1/admin/customers"
ENVELOPE = {"status":"estimate_received","revision":1,"removed_lines":[],
            "estimate":{"profile_name":"Local test","lines":[],"known_subtotal_rub":0}}


def seed(root, lead_ids=("a"*32,"b"*32), contact="+70000000000"):
    for lead_id in lead_ids:
        cid = upsert_customer(root, lead_id=lead_id, name="Local customer", contact_method="phone",
                              contact=contact, created_at="2026-11-18", envelope=ENVELOPE)
        directory = root/"leads"/lead_id
        directory.mkdir(parents=True)
        record = {"id":lead_id,"customer_id":cid,"created_at":"2026-11-18","estimate":"estimate.json",
                  "manager_access":{"token_sha256":sha256(b"local-manager").hexdigest()}}
        (directory/"lead.json").write_text(json.dumps(record))
        (directory/"estimate.json").write_text(json.dumps(ENVELOPE))
        (directory/"notes.json").write_text('{"notes":"Local private note"}')
        (directory/"invoice-r1.pdf").write_bytes(b"%PDF-local-private-document")
        (directory/"attachment.jpg").write_bytes(b"private-attachment")
        (directory/"estimate-revisions").mkdir()
        (directory/"estimate-revisions"/"revision-1.json").write_text(json.dumps(ENVELOPE))
    return cid


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr("app.modules.leads.customer_router.settings.media_storage_dir",str(tmp_path))
    monkeypatch.setattr("app.modules.boms.dependencies.settings.bom_admin_token","deletion-test-admin")
    app=FastAPI()
    app.include_router(router,prefix=BASE)
    app.include_router(leads_router,prefix="/api/v1/leads")
    with TestClient(app) as c:
        yield c


def preview(client,cid):
    response=client.get(f"{BASE}/{cid}/deletion-preview",headers=ADMIN)
    assert response.status_code==200,response.text
    return response.json()


def delete(client,cid,version,headers=ADMIN):
    return client.request("DELETE",f"{BASE}/{cid}",headers=headers,
                          json={"expected_version":version,"confirmation":"delete_customer_with_estimates"})


def file_bytes(root):
    return {str(p.relative_to(root)):p.read_bytes() for p in root.rglob("*") if p.is_file()}


def test_delete_all_estimates_documents_then_restore_exact_bytes(tmp_path,client):
    cid=seed(tmp_path)
    other=seed(tmp_path,("c"*32,),"+71111111111")
    customer_bytes=(tmp_path/"customers"/f"{cid}.json").read_bytes()
    old={i:file_bytes(tmp_path/"leads"/i) for i in ("a"*32,"b"*32,"c"*32)}
    snapshot=preview(client,cid)
    assert snapshot["estimate_count"]==2 and snapshot["lead_count"]==2
    result=delete(client,cid,snapshot["version"])
    assert result.status_code==200,result.text
    assert result.headers["cache-control"]=="no-store"
    archive_id=result.json()["deletion_id"]
    archive=tmp_path/"leads"/".trash"/archive_id
    assert (archive.stat().st_mode & 0o777)==0o700
    assert (archive/"customer.json").read_bytes()==customer_bytes
    assert json.loads((archive/"manifest.json").read_text())["status"]=="deleted"
    assert not (tmp_path/"customers"/f"{cid}.json").exists()
    for lead_id in ("a"*32,"b"*32):
        assert not (tmp_path/"leads"/lead_id).exists()
        assert file_bytes(archive/"leads"/lead_id)==old[lead_id]
        assert client.get(f"/api/v1/leads/{lead_id}/manager",headers={"X-Lead-Manager-Token":"local-manager"}).status_code==404
        assert client.get(f"/api/v1/leads/{lead_id}/manager/pdf?document=invoice",headers=ADMIN).status_code==404
    assert file_bytes(tmp_path/"leads"/("c"*32))==old["c"*32]
    assert client.get(BASE,headers=ADMIN).json()["items"][0]["id"]==other
    restored=client.post(f"{BASE}/trash/{archive_id}/restore",headers=ADMIN)
    assert restored.status_code==200
    assert (tmp_path/"customers"/f"{cid}.json").read_bytes()==customer_bytes
    for lead_id in ("a"*32,"b"*32):
        assert file_bytes(tmp_path/"leads"/lead_id)==old[lead_id]
        assert client.get(f"/api/v1/leads/{lead_id}/manager",headers={"X-Lead-Manager-Token":"local-manager"}).status_code==200
    assert delete(client,cid,snapshot["version"]).status_code==200


def test_all_actions_require_admin_not_a_manager_token(tmp_path,client):
    cid=seed(tmp_path)
    version=preview(client,cid)["version"]
    for headers in ({},{"X-BOM-Admin-Token":"wrong"},{"X-Lead-Manager-Token":"local-manager"}):
        assert client.get(f"{BASE}/{cid}/deletion-preview",headers=headers).status_code==401
        assert delete(client,cid,version,headers).status_code==401
        assert client.post(f"{BASE}/trash/{'d'*32}/restore",headers=headers).status_code==401
    assert (tmp_path/"customers"/f"{cid}.json").exists()


@pytest.mark.parametrize("change",["name","estimate","notes","new_lead"])
def test_stale_confirmation_cannot_delete_changed_data(tmp_path,client,change):
    cid=seed(tmp_path)
    version=preview(client,cid)["version"]
    if change=="name":
        path=tmp_path/"customers"/f"{cid}.json"
        record=json.loads(path.read_text());record["name"]="Changed";path.write_text(json.dumps(record))
    elif change=="new_lead":
        seed(tmp_path,("d"*32,))
    else:
        path=tmp_path/"leads"/("a"*32)/("estimate.json" if change=="estimate" else "notes.json")
        path.write_text(path.read_text()+" ")
    assert delete(client,cid,version).status_code==409
    assert (tmp_path/"customers"/f"{cid}.json").exists()
    assert (tmp_path/"leads"/("a"*32)).exists()


@pytest.mark.parametrize("body",[{}, {"expected_version":"a"*64},
    {"expected_version":"a"*64,"confirmation":"yes"},
    {"expected_version":"a"*64,"confirmation":"delete_customer_with_estimates","lead_ids":[]}])
def test_explicit_confirmation_and_version_are_required(tmp_path,client,body):
    cid=seed(tmp_path)
    assert client.request("DELETE",f"{BASE}/{cid}",headers=ADMIN,json=body).status_code==422
    assert (tmp_path/"customers"/f"{cid}.json").exists()


def test_shared_or_mismatched_lead_is_never_deleted(tmp_path,client):
    cid=seed(tmp_path)
    other=seed(tmp_path,("c"*32,),"+71111111111")
    path=tmp_path/"customers"/f"{other}.json"
    data=json.loads(path.read_text());data["estimates"].append({"lead_id":"a"*32});path.write_text(json.dumps(data))
    assert client.get(f"{BASE}/{cid}/deletion-preview",headers=ADMIN).status_code==409
    assert (tmp_path/"leads"/("a"*32)).exists()
    data["estimates"].pop();path.write_text(json.dumps(data))
    lead=tmp_path/"leads"/("a"*32)/"lead.json"
    record=json.loads(lead.read_text());record["customer_id"]=other;lead.write_text(json.dumps(record))
    assert client.get(f"{BASE}/{cid}/deletion-preview",headers=ADMIN).status_code==409


def test_owned_lead_missing_from_index_is_archived_too(tmp_path,client):
    cid=seed(tmp_path)
    path=tmp_path/"customers"/f"{cid}.json"
    record=json.loads(path.read_text());record["estimates"].pop();path.write_text(json.dumps(record))
    snapshot=preview(client,cid)
    assert snapshot["lead_count"]==2
    assert delete(client,cid,snapshot["version"]).status_code==200
    assert not (tmp_path/"leads"/("b"*32)).exists()


def test_midway_failure_restores_active_files_without_destroying_them(tmp_path,monkeypatch):
    cid=seed(tmp_path)
    version=deletion_preview(tmp_path,cid)["version"]
    customer_bytes=(tmp_path/"customers"/f"{cid}.json").read_bytes()
    files={i:file_bytes(tmp_path/"leads"/i) for i in ("a"*32,"b"*32)}
    rename=Path.rename
    def fail(self,target):
        if self==tmp_path/"leads"/("b"*32):
            raise OSError("simulated disk failure")
        return rename(self,target)
    monkeypatch.setattr(Path,"rename",fail)
    with pytest.raises(OSError):
        delete_customer(tmp_path,cid,version)
    assert (tmp_path/"customers"/f"{cid}.json").read_bytes()==customer_bytes
    for i in files:
        assert file_bytes(tmp_path/"leads"/i)==files[i]


def test_restore_conflict_preserves_new_customer_and_old_archive(tmp_path):
    cid=seed(tmp_path)
    result=delete_customer(tmp_path,cid,deletion_preview(tmp_path,cid)["version"])
    seed(tmp_path,("d"*32,))  # A legitimate new request from the same contact.
    sync_customer_estimate(tmp_path,{"customer_id":cid,"id":"a"*32,"created_at":"old"},ENVELOPE)
    assert [item["lead_id"] for item in list_customers(tmp_path)[0]["estimates"]]==["d"*32]
    with pytest.raises(CustomerDeletionConflict):
        restore_customer(tmp_path,result["deletion_id"])
    assert (tmp_path/"leads"/("d"*32)).exists()
    assert not (tmp_path/"leads"/("a"*32)).exists()


def test_symlinks_and_invalid_paths_are_rejected(tmp_path,client):
    cid=seed(tmp_path)
    outside=tmp_path/"outside.txt";outside.write_text("keep")
    (tmp_path/"leads"/("a"*32)/"link.txt").symlink_to(outside)
    assert client.get(f"{BASE}/{cid}/deletion-preview",headers=ADMIN).status_code==409
    for bad in ("invalid","a"*33):
        assert client.get(f"{BASE}/{bad}/deletion-preview",headers=ADMIN).status_code==404
    assert outside.read_text()=="keep"


def test_empty_customer_can_be_archived_and_restored_without_lead_directories(tmp_path):
    cid=upsert_customer(tmp_path,lead_id="a"*32,name="Empty",contact_method="phone",contact="+70000000000",
                        created_at="now",envelope=ENVELOPE)
    preview_data=deletion_preview(tmp_path,cid)
    assert preview_data["lead_count"]==0
    result=delete_customer(tmp_path,cid,preview_data["version"])
    restore_customer(tmp_path,result["deletion_id"])
    assert list_customers(tmp_path)[0]["id"]==cid


def test_trash_is_not_exposed_by_public_media(tmp_path,monkeypatch):
    monkeypatch.setattr("app.core.config.settings.media_storage_dir",str(tmp_path))
    from app.main import create_app
    cid=seed(tmp_path)
    result=delete_customer(tmp_path,cid,deletion_preview(tmp_path,cid)["version"])
    with TestClient(create_app()) as client:
        for suffix in ("customer.json","manifest.json",f"leads/{'a'*32}/invoice-r1.pdf"):
            assert client.get(f"/media/leads/.trash/{result['deletion_id']}/{suffix}").status_code==404

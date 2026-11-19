export type SpecificationGroup = {
  kind: "general" | "inner" | "insulation" | "outer";
  title: string;
  fields: { key: string; label: string; value: string }[];
};

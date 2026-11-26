// Dated catalogue comparison approved in the owner draft (24 November 2026).
// Public ready-kit specifications rechecked on 26 November 2026; totals match.
export const routeKitPriceDate = "2026-11-24";

export const routeComparisonKits = [
  {
    route: "wall", slug: "cherez-stenu-6m-d115", diameterMm: 115, heightM: 6,
    lines: [
      {"article": "DT-GOLYE-09-11-D115", "quantity": 1, "lengthMm": null, "unitPriceKopecks": 212014},
      {"article": "DT-SW50-19-11-D115-215", "quantity": 1, "lengthMm": null, "unitPriceKopecks": 164450},
      {"article": "DT-SW50-19-01-D115-215", "quantity": 1, "lengthMm": 750, "unitPriceKopecks": 404800},
      {"article": "DT-SW50-17-00-D115-215", "quantity": 6, "lengthMm": 1000, "unitPriceKopecks": 379880},
      {"article": "DT-PASSAGE-GLASS-GALV-D100-200", "quantity": 1, "lengthMm": null, "unitPriceKopecks": 60000},
      {"article": "DT-PASSAGE-WOOL-KIT", "quantity": 1, "lengthMm": null, "unitPriceKopecks": 130000},
      {"article": "DT-FLANGE-430-STRAIGHT-600X600", "quantity": 2, "lengthMm": null, "unitPriceKopecks": 167200},
      {"article": "DT-SW50-19-08-D115-215", "quantity": 1, "lengthMm": null, "unitPriceKopecks": 653626},
      {"article": "DT-SW50-17-04-D115-215", "quantity": 1, "lengthMm": 250, "unitPriceKopecks": 185070},
      {"article": "DT-SUPPORT-PLATFORM-304-430-D115-215", "quantity": 1, "lengthMm": null, "unitPriceKopecks": 343800},
      {"article": "DT-CONSOLE-UNIVERSAL-930-D350", "quantity": 1, "lengthMm": null, "unitPriceKopecks": 300000},
      {"article": "DT-CONSOLE-UNIVERSAL-930-D350", "quantity": 2, "lengthMm": null, "unitPriceKopecks": 300000},
      {"article": "DT-GOLYE-05-14-D215", "quantity": 2, "lengthMm": null, "unitPriceKopecks": 89900},
      {"article": "DT-SW50-17-15-D115-215", "quantity": 1, "lengthMm": null, "unitPriceKopecks": 291330},
    ],
  },
  {
    route: "roof", slug: "cherez-perekrytie-6m-d115", diameterMm: 115, heightM: 6,
    lines: [
      {"article": "DT-GOLYE-09-00-D115", "quantity": 1, "lengthMm": 1000, "unitPriceKopecks": 199238},
      {"article": "DT-GOLYE-09-11-D115", "quantity": 1, "lengthMm": null, "unitPriceKopecks": 212014},
      {"article": "DT-SW50-19-11-D115-215", "quantity": 1, "lengthMm": null, "unitPriceKopecks": 164450},
      {"article": "DT-SW50-19-00-D115-215", "quantity": 1, "lengthMm": 1000, "unitPriceKopecks": 468050},
      {"article": "DT-SW50-17-00-D115-215", "quantity": 5, "lengthMm": 1000, "unitPriceKopecks": 379880},
      {"article": "DT-PASSAGE-GLASS-GALV-D100-200", "quantity": 2, "lengthMm": null, "unitPriceKopecks": 60000},
      {"article": "DT-PASSAGE-WOOL-KIT", "quantity": 2, "lengthMm": null, "unitPriceKopecks": 130000},
      {"article": "DT-FLANGE-430-STRAIGHT-600X600", "quantity": 4, "lengthMm": null, "unitPriceKopecks": 167200},
      {"article": "DT-FLOOR-CLAMP-UP-TO-D300", "quantity": 1, "lengthMm": null, "unitPriceKopecks": 176000},
      {"article": "DT-MASTER-FLASH-2", "quantity": 1, "lengthMm": null, "unitPriceKopecks": 250000},
      {"article": "DT-SW50-17-15-D115-215", "quantity": 1, "lengthMm": null, "unitPriceKopecks": 291330},
    ],
  },
] as const;

export const routeKitTotalKopecks = (kit: typeof routeComparisonKits[number]) =>
  kit.lines.reduce((total, line) => total + line.quantity * line.unitPriceKopecks, 0);

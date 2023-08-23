// External
import { describe, test, expect, vi, afterEach } from "vitest";

// Internal
import { logInvalidShippingChangePatches, isWeasley } from "./utils";
import { getLogger } from "../lib";

describe("utils", () => {
  describe("#isWeasley", () => {
    test("returns `true` if appName is `weasley`", () => {
      expect(isWeasley("weasley")).toBe(true);
    });

    test("returns `false` if appName is not `weasley`", () => {
      expect(isWeasley("xoon")).toBe(false);
    });
  });

  describe("#logInvalidShippingChangePatches", () => {
    afterEach(() => {
      vi.resetAllMocks();
    });

    test("when appName is present and has invalid patches", () => {
      getLogger().info = vi.fn();
      logInvalidShippingChangePatches({
        appName: "xoon",
        buyerAccessToken: "ABC",
        data: [
          {
            path: "/purchase_units/@reference_id=='default'",
          },
        ],
        shouldUsePatchShipping: false,
      });

      expect(getLogger().info).toHaveBeenCalledWith(
        "button_shipping_change_patch_data_has_invalid_path_xoon",
        {
          appName: "xoon",
          rejected: "[\"/purchase_units/@reference_id=='default'\"]",
          hasBuyerAccessToken: "true",
          shouldUsePatchShipping: "false",
        }
      );
    });

    test("when it has valid patches, it should not log", () => {
      getLogger().info = vi.fn();
      logInvalidShippingChangePatches({
        appName: "xoon",
        buyerAccessToken: "ABC",
        data: [
          {
            path: "/purchase_units/@reference_id=='default'/amount",
          },
          {
            path: "/purchase_units/@reference_id=='default'/shipping/address",
          },
          {
            path: "/purchase_units/@reference_id=='default'/shipping/options",
          },
          {
            path: "/purchase_units/@reference_id=='d9f80740-38f0-11e8-b467-0ed5f89f718b'/amount",
          },
        ],
        shouldUsePatchShipping: false,
      });

      expect(getLogger().info).not.toHaveBeenCalled();
    });

    test("when patch `data` is not an array, it should emit an info log", () => {
      getLogger().info = vi.fn();
      logInvalidShippingChangePatches({
        appName: "weasley",
        buyerAccessToken: null,
        data: {},
        shouldUsePatchShipping: true,
      });

      expect(getLogger().info).toHaveBeenCalledWith(
        "button_shipping_change_patch_data_is_object",
        {
          appName: "weasley",
          hasBuyerAccessToken: "false",
          shouldUsePatchShipping: "true",
        }
      );
    });
  });
});

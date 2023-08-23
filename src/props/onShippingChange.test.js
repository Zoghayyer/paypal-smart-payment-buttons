/** @flow */

import { uniqueID } from "@krakenjs/belter/src";
import { ZalgoPromise } from "@krakenjs/zalgo-promise/src";
import { describe, beforeEach, test, expect, vi } from "vitest";

import { patchShipping, patchOrder } from "../api";
import { getLogger } from "../lib";

import { getOnShippingChange } from "./onShippingChange";

vi.mock("../api");
vi.mock("./createOrder");
vi.mock("../lib");

const mockPatchOrder = patchOrder;
const mockPatchShipping = patchShipping;
const mockGetLogger = getLogger;

describe("onShippingChange", () => {
  describe("getOnShippingChange", () => {
    let clientID;
    let facilitatorAccessToken;
    let partnerAttributionID;
    let orderID;
    const createOrder = vi.fn();
    const invocationActions = {
      reject: () => ZalgoPromise.reject(),
      resolve: () => ZalgoPromise.resolve(),
    };
    const featureFlags = { isLsatUpgradable: false };

    beforeEach(() => {
      clientID = uniqueID();
      facilitatorAccessToken = uniqueID();
      partnerAttributionID = uniqueID();
      orderID = uniqueID();
      createOrder.mockImplementation(() => ZalgoPromise.resolve(orderID));

      // $FlowFixMe
      mockGetLogger.mockReturnValue({
        // $FlowFixMe
        info: () => ({
          // $FlowFixMe
          track: () => ({ flush: () => undefined }),
        }),
      });
    });

    test("should invoke onShippingChange with a paymentID aliased to orderID", () => {
      const merchantOnShippingChange = vi.fn();
      const fn = getOnShippingChange(
        {
          clientID,
          experiments: {
            btSdkOrdersV2Migration: true,
          },
          featureFlags,
          onShippingChange: merchantOnShippingChange,
          partnerAttributionID,
        },
        { facilitatorAccessToken, createOrder }
      );

      if (fn) {
        fn({ orderID: "EC-abc123" }, invocationActions);
      }

      expect(merchantOnShippingChange).toHaveBeenCalledWith(
        expect.objectContaining({
          orderID: "EC-abc123",
          paymentID: "abc123",
          paymentId: "abc123",
        }),
        expect.anything()
      );
    });

    describe("should call patchOrder", () => {
      test("when useShippingChangeCallbackMutation is inactive", async () => {
        // $FlowFixMe
        mockPatchOrder.mockImplementation(() => ZalgoPromise.resolve({}));

        const patchData = [];
        const onShippingChange = vi.fn((data, actions) => {
          return actions.order.patch(patchData);
        });

        const experiments = { useShippingChangeCallbackMutation: false };

        const buyerAccessToken = uniqueID();

        const fn = getOnShippingChange(
          {
            onShippingChange,
            partnerAttributionID,
            featureFlags,
            experiments,
            clientID,
          },
          { facilitatorAccessToken, createOrder }
        );

        const data = { buyerAccessToken };

        if (fn) {
          await fn(data, invocationActions);
          expect(patchOrder).toBeCalledWith(orderID, patchData, {
            facilitatorAccessToken,
            buyerAccessToken,
            partnerAttributionID,
            forceRestAPI: featureFlags.isLsatUpgradable,
          });
        }

        expect.assertions(1);
      });

      test("when useShippingChangeCallbackMutation is active, but appName is not weasley", async () => {
        // $FlowFixMe
        mockPatchOrder.mockImplementation(() => ZalgoPromise.resolve({}));

        const patchData = [];
        const onShippingChange = vi.fn((data, actions) => {
          return actions.order.patch(patchData);
        });

        const experiments = { useShippingChangeCallbackMutation: true };

        const buyerAccessToken = uniqueID();

        const fn = getOnShippingChange(
          {
            onShippingChange,
            partnerAttributionID,
            featureFlags,
            experiments,
            clientID,
          },
          { facilitatorAccessToken, createOrder }
        );

        const data = { appName: "xoon", buyerAccessToken };

        if (fn) {
          await fn(data, invocationActions);
          expect(patchOrder).toBeCalledWith(orderID, patchData, {
            facilitatorAccessToken,
            buyerAccessToken,
            partnerAttributionID,
            forceRestAPI: featureFlags.isLsatUpgradable,
          });
        }

        expect.assertions(1);
      });

      test("should return generic error if patchOrder fails", async () => {
        // $FlowFixMe
        mockPatchOrder.mockImplementation(() => ZalgoPromise.reject({}));

        const patchData = [];
        const onShippingChange = vi.fn((data, actions) => {
          return actions.order.patch(patchData);
        });

        const experiments = { useShippingChangeCallbackMutation: false };

        const buyerAccessToken = uniqueID();

        const fn = getOnShippingChange(
          {
            onShippingChange,
            partnerAttributionID,
            featureFlags,
            experiments,
            clientID,
          },
          { facilitatorAccessToken, createOrder }
        );

        const data = { buyerAccessToken };

        if (fn) {
          await expect(fn(data, invocationActions)).rejects.toThrow(
            "Order could not be patched"
          );
        }

        expect.assertions(1);
      });
    });

    describe("should call patchShipping", () => {
      test("when useShippingChangeCallbackMutation is active, appName is weasley, and there is no access token", async () => {
        // $FlowFixMe
        mockPatchShipping.mockImplementation(() => ZalgoPromise.resolve({}));

        const patchData = [];
        const onShippingChange = vi.fn((data, actions) => {
          return actions.order.patch(patchData);
        });

        const experiments = { useShippingChangeCallbackMutation: true };

        const fn = getOnShippingChange(
          {
            onShippingChange,
            partnerAttributionID,
            featureFlags,
            experiments,
            clientID,
          },
          { facilitatorAccessToken, createOrder }
        );
        const data = { appName: "weasley", buyerAccessToken: null };

        if (fn) {
          await fn(data, invocationActions);
        }

        expect(patchShipping).toBeCalledWith({
          clientID,
          data: patchData,
          orderID,
        });

        expect.assertions(1);
      });

      test("should return generic error if patchShipping fails", async () => {
        // $FlowFixMe
        mockPatchShipping.mockImplementation(() => ZalgoPromise.reject({}));

        const patchData = [];
        const onShippingChange = vi.fn((data, actions) => {
          return actions.order.patch(patchData);
        });

        const experiments = { useShippingChangeCallbackMutation: true };

        const fn = getOnShippingChange(
          {
            onShippingChange,
            partnerAttributionID,
            featureFlags,
            experiments,
            clientID,
          },
          { facilitatorAccessToken, createOrder }
        );

        if (fn) {
          await expect(fn({}, invocationActions)).rejects.toThrow(
            "Order could not be patched"
          );
        }

        expect.assertions(1);
      });
    });
  });
});

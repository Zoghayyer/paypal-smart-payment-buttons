/* @flow */

import type { Breakdown } from '../types';

import { type Query, type ShippingOption, ON_SHIPPING_CHANGE_PATHS } from './onShippingChange';
import { getLogger } from '../lib';


export const calculateTotalFromShippingBreakdownAmounts = ({ breakdown, updatedAmounts } : {| breakdown : Breakdown, updatedAmounts : {| [string] : ?string |} |}) : string => {
    let newAmount = 0;
    const updatedAmountKeys = Object.keys(updatedAmounts) || [];
    const discountKeys = [ 'shipping_discount', 'discount' ];

    Object.keys(breakdown).forEach(item => {
        if (updatedAmountKeys.indexOf(item) !== -1) {
            if (discountKeys.includes(item)) {
                newAmount -= Math.abs(parseFloat(updatedAmounts[item]));
            } else {
                newAmount += parseFloat(updatedAmounts[item]);
            }
        } else {
            if (discountKeys.includes(item)) {
                newAmount -= Math.abs(parseFloat(breakdown[item]?.value));
            } else {
                newAmount += parseFloat(breakdown[item]?.value);
            }
        }
    });

    updatedAmountKeys.forEach(key => {
        if (!breakdown[key]) {
            if (updatedAmounts[key]) {
                if (discountKeys.includes(key)) {
                    newAmount -= Math.abs(parseFloat(updatedAmounts[key]));
                } else {
                    newAmount += parseFloat(updatedAmounts[key]);
                }
            }
        }
    });

    return newAmount.toFixed(2);
};

export const buildBreakdown = ({ breakdown = {}, updatedAmounts = {} } : {| breakdown : Breakdown, updatedAmounts : {| [string] : ?string |} |}) : Breakdown => {
    const discountKeys = [ 'shipping_discount', 'discount' ];
    const updatedAmountKeys = Object.keys(updatedAmounts);

    // $FlowFixMe
    const currency_code = Object.values(breakdown)[0]?.currency_code;

    updatedAmountKeys.forEach(key => {
        if (!breakdown[key]) {
            if (updatedAmounts[key]) {
                breakdown[key] = {
                    currency_code,
                    value: updatedAmounts[key] && discountKeys.includes(key) ? Math.abs(parseFloat(updatedAmounts[key])).toFixed(2) : updatedAmounts[key]
                };
            }
        } else {
            breakdown[key].value = updatedAmounts[key];
        }
    });

    return breakdown;
};

export const convertQueriesToArray = ({ queries } : {| queries : {| [$Values<typeof ON_SHIPPING_CHANGE_PATHS>] : Query |} |}) : $ReadOnlyArray<Query> => {
    // $FlowFixMe
    return Object.values(queries) || [];
};

export const updateShippingOptions = ({ option, options } : {| option: ShippingOption, options : $ReadOnlyArray<ShippingOption>|}) : $ReadOnlyArray<ShippingOption> => {
    const updatedOptions = [];

    options.forEach(opt => {
        if (!opt.id) {
            throw new Error(`Must provide an id with each shipping option.`);
        }

        if (opt.id === option.id) {
            opt.selected = true;
            updatedOptions.push(opt);
        } else {
            opt.selected = false;
            updatedOptions.push(opt);
        }
    });

    return updatedOptions;
};

export const updateOperationForShippingOptions = ({ queries } : {| queries : {| [$Values<typeof ON_SHIPPING_CHANGE_PATHS>] : Query |} |}) : $ReadOnlyArray<Query> => {
    if (queries[ON_SHIPPING_CHANGE_PATHS.OPTIONS]) {
        queries[ON_SHIPPING_CHANGE_PATHS.OPTIONS].op = 'replace';
    }

    return convertQueriesToArray({ queries });
}


/**
 * Full matches the following;
 *  /purchase_units/@reference_id=='default'/amount
 *  /purchase_units/@reference_id=='default'/shipping/address
 *  /purchase_units/@reference_id=='default'/shipping/options
 *  /purchase_units/@reference_id=='d9f80740-38f0-11e8-b467-0ed5f89f718b'/amount
 */
const pathPattern = new RegExp(
    /^\/purchase_units\/@reference_id=='(?:\w|-)*'\/(?:amount|shipping\/(?:options|address))$/
);

/**
 *
 * @param {array} result
 * @param {{ path: string; }} patch
 * @returns {array}
 */
const sanitizePatch = (rejected, patch) => {
    const { path } = patch;

    if (!pathPattern.test(path)) {
        rejected.push(path);
    }
    return rejected;
};

/**
 *
 * @param {string} appName
 * @returns {boolean}
 */
export const isWeasley = (appName: string) => appName === 'weasley';

export const logInvalidShippingChangePatches = ({ appName, buyerAccessToken, data, shouldUsePatchShipping }) => {
    try {
        if (Array.isArray(data)) {
            const rejected = data.reduce(sanitizePatch, []);
            if (rejected.length > 0) {
                getLogger()
                .info(`button_shipping_change_patch_data_has_invalid_path_${appName}`, {
                    appName,
                    rejected: JSON.stringify(rejected),
                    hasBuyerAccessToken: String(Boolean(buyerAccessToken)),
                    shouldUsePatchShipping: String(shouldUsePatchShipping)
                })
                .flush();
            }
        } else {
            getLogger()
            .info('button_shipping_change_patch_data_is_object', {
                appName,
                hasBuyerAccessToken: String(Boolean(buyerAccessToken)),
                shouldUsePatchShipping: String(shouldUsePatchShipping)
            })
            .flush();
        }
    } catch(err) {
        getLogger()
        .error('button_shipping_change_patch_data_logging_failed', {
            appName,
            errMessage: JSON.stringify(err),
            hasBuyerAccessToken: String(Boolean(buyerAccessToken)),
            shouldUsePatchShipping: String(shouldUsePatchShipping)
        })
        .flush();
    }
}

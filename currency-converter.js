/**
 * Currency updating process:
 *	Step 1. Get all objects on page that have the custom class defined as a global below
 *	Step 2. Throw an error if no objects are found with the custom class
 *	Step 3. Iterate over each element found and do the following:
 *		Step 3a. Remove the currency symbol from the contained string
 *		Step 3b. Convert the currency value to the local currency
 *		Step 3c. Add the local currency symbol to the currency value
 *		Step 3d. Replace the contained string with the converted result
 *
 * Note: this is one file because of Shopify
 */


/**
 * GLOBAL DEFINITIONS
 */

    // class name of elements that contain prices to convert
const CONVERSION_CONTAINER_CLASS = 'price-conversion-hook'
// allowed currency conversions
// if users currency is not in this list, currency stays at default (GBP)
const ENABLED_CURRENCIES = ['GBP', 'USD', 'EUR']


/**
 *
 * @param price (integer / float) - price to format according to newCurrency
 * @param newCurrency (string) - currency code for new currency format
 * @return
 *  - success (string) - price with new currency sign
 *  - failure: error
 *      - price parameter is not a number (integer or float)
 *      - currency parameter is not a currency enabled by this Shopify store
 *      - .toLocaleString() is not working on price parameter.
 *
 * @about - takes a price and uses .toLocaleString() to format it according to newCurrency
 */
function addNewCurrencySign(price, newCurrency) {

    // Step 3c. Add the local currency symbol to the currency value
    if (typeof price === 'number') {
        if (currencyIsEnabled(newCurrency)) {
            const options = {
                style: 'currency',
                currency: newCurrency
            }
            try {
                return price.toLocaleString('en', options)
            } catch (error) {
                throw `Error: .toLocaleString() is not working on price parameter "${price}".`
            }
        } else {
            throw `Error: ${newCurrency} not an enabled Store Currency.`
        }
    } else {
        throw `Error: Price parameter "${price}" is not a number.`
    }
}


/**
 *
 * @param priceValue (string/float) - price value to be converted
 * @return
 *  - success: (float) - new value according to local conversion rate
 *  - failure: error
 *
 * @about - converts given price value to local currency
 * @TODO - catch and throw errors
 */
function convertToLocalCurrency(priceValue) {
    // Step 3b. Convert the currency value to the local currency
    return parseFloat(( parseFloat(priceValue) * (new CookieHelper().getValue('localConversionRate')) ).toFixed(2))
}


/**
 *
 * @param currency (string) - currency code to check against shops enabled currencies
 * @param allowedCurrencies (default: null) - array that contains string currency codes enabled by Shopify store
 * @returns
 *  - success: (boolean) - whether or not the given currency is enabled by Shopify store
 *  - failure: error
 *      - allowedCurrencies parameter is not an Array
 *
 * @about - determines whether given currency code is enabled by Shopify store
 */
function currencyIsEnabled(currency, allowedCurrencies=null) {
    if (allowedCurrencies === null) {
        allowedCurrencies = ENABLED_CURRENCIES
    }
    if (Array.isArray(allowedCurrencies)) {
        if (allowedCurrencies.includes(currency)) {
            return true
        } else {
            return false
        }
    } else {
        throw `Error: given allowedCurrencies parameter is not an Array of currency codes.`
    }
}


/**
 * @param priceString (string) - price as an int (eg. '4999')
 * @param currency (default: null) - string currency by which to format string
 * @return
 *  - success: (float) - price as a float to two places (eg. 49.99)
 *  - failure: error
 *      - currency parameter is not a String
 *      - priceString parameter is not Float parsable
 *      - there was an error slicing parseString parameter
 *
 * @about - takes Shopify-given price string and returns it as a float (eg. '4999' => 49.99)
 *
 * @TODO - account for single- and double- digit priceString inputs. May break if given those.
 */
function currencyStringToFloat(priceString, currency=null) {

    if (currency === null || currency === undefined) {
        currency = new CookieHelper().getValue('storeCurrencyCode')
    }
    if (typeof currency === 'string') {
        if (currencyIsEnabled(currency)) {
            try {
                return parseFloat(priceString.slice(0, -2) + '.' + priceString.slice(-2))
            } catch(error) {
                throw `Error: an error occurred attempting to slice priceString parameter ` +
                `"${priceString}.\n${error}`
            }
        }
    } else {
        throw `Error: Given currency "${currency}" is not a string.`
    }
}


/**
 *
 * @param priceText (string) - raw text representing product price straight from the DOM
 *  - if liquid formatted, looks like "£19.99"; otherwise looks like "1999"
 * @returns
 *  - success: (string) - stringified float representation of given priceText
 *  - failure: NaN
 *    - priceText parameter is not a valid signed price value (eg. not "$19.99")
 *
 * @about - assumes that if isNan(priceText) returns true, priceText begins with a currency sign
 * @TODO - instead of using isNaN(), check if the first character is within an ASCII range.
 */
function stripCurrencySignsFromString(priceText) {

    // Step 3a. Remove the currency symbol from the contained string
    if (isNaN(parseInt(priceText))) {
        // cannot parsInt from priceText, so it must contain a currency sign
        return parseFloat(priceText.slice(1))
    } else {
        return currencyStringToFloat(priceText)
    }
}


/**
 *
 * @param object (object) - element containing the price text needing conversion
 * @return
 *  - success: (string) - converted price text inside element
 *  - failure: error
 */
function processStringPriceConversion(object) {
    return addNewCurrencySign(
        // Step 3a can be found in stripCurrencySignsFromString()
        convertToLocalCurrency( stripCurrencySignsFromString( object.text().trim() ) ),
        new CookieHelper().getValue('localCurrencyCode')
    )
}


/**
 *
 * @param localCurrencyCode (string) - currency code of user based on IP geolocation
 * @param containerClass (string) - class of element that contains raw currency string to convert
 * @returns
 *  - success: none (currencies on page are updated)
 *  - failure: currencies on page are untouched, error is logged
 */
function updatePage(localCurrencyCode, containerClass) {

    // Step 1. Get all objects on the page that have the custom class defined as a global below
    const elementsWithPrices = $( `.${containerClass}` )

    // Step 2. Throw an error if no objects are found with the custom class
    if (elementsWithPrices.length < 1 ) {
        throw `Error: No class found by the name of "${containerClass}".`
    }

    // Step 3. Iterate over each element and adjust the contained currency
    $(elementsWithPrices).each(function(index) {
        // Steps 3a - 3c can be found by following processStringPriceConversion()
        const convertedPrice = processStringPriceConversion( $(this) )
        // Step 3d. Replace the contained string with the converted result
        $(this).text(convertedPrice)
    })
}


(() => {
    const c = new CookieHelper()
    try {
        updatePage(
            c.getValue('localCurrencyCode'),	// apply this currency code
            CONVERSION_CONTAINER_CLASS			// to contents of elements with this class
        )
    } catch(error) {
        console.log(error)
    }
})()
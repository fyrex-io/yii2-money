/*
 *  jquery-maskmoney - v3.1.1
 *  jQuery plugin to mask data entry in the input text in the form of money (currency)
 *  https://github.com/plentz/jquery-maskmoney
 *
 *  Made by Diego Plentz
 *  Modifications by Kartik Visweswaran for github.com/kartik-v/yii2-money:
 *  - fixes mask display bugs when precision is set to zero and suffix is set
 *  - fixes masking when precision is set but the decimal part length is less than precision length (for example
 *    1400.50 with precision 2 is wrongly displayed as 140.05 - the last zero was omitted)
 *
 *  Under MIT License
 */
(function ($) {
    "use strict";
    if (!$.browser) {
        $.browser = {};
        $.browser.mozilla = /mozilla/.test(navigator.userAgent.toLowerCase()) && !/webkit/.test(navigator.userAgent.toLowerCase());
        $.browser.webkit = /webkit/.test(navigator.userAgent.toLowerCase());
        $.browser.opera = /opera/.test(navigator.userAgent.toLowerCase());
        $.browser.msie = /msie/.test(navigator.userAgent.toLowerCase());
        $.browser.mobile = /mobile|android|iphone|ipad|phone|ipod|blackberry|iemobile|kindle|silk|opera mini/.test(navigator.userAgent.toLowerCase());
    }

    var methods = {
        destroy: function () {
            $(this).unbind(".maskMoney");

            if ($.browser.msie) {
                this.onpaste = null;
            }
            return this;
        },

        applyMask: function (value) {
            var $input = $(this);
            // data-* api
            var settings = $input.data("settings");
            return maskValue(value, settings);
        },

        mask: function (value) {
            return this.each(function () {
                var $this = $(this);
                if (typeof value === "number") {
                    $this.val(value);
                }
                return $this.trigger("mask");
            });
        },

        unmasked: function () {
            return this.map(function () {

                var $input = $(this);
                // data-* api
                var settings = $input.data("settings");

                var value = ($(this).val() || "0"),
                    isNegative = value.indexOf("-") !== -1,
                    decimalPart = "";
                // get the last position of the array that is a number(coercion makes "" to be evaluated as false)

                var split = value.split(settings.decimal);

                if (split[1]) {
                    decimalPart = split[1];
                }

                split = split[0].split(/\D/);

                if (split.length > 1) {

                    value = "";

                    $(split).each(function (index, element) {
                        if (element) {
                            value += element;
                        }
                    });
                }

                value = value.replace(/\D/g, "");

                value = value + "." + decimalPart;
                if (isNegative) {
                    value = "-" + value;
                }

                return parseFloat(value);
            });
        },

        init: function (parameters) {
            parameters = $.extend({
                prefix: "",
                suffix: "",
                affixesStay: true,
                thousands: ",",
                decimal: ".",
                precision: 2,
                allowZero: false,
                allowNegative: false,
                doubleClickSelection: true,
                allowEmpty: false
            }, parameters);

            return this.each(function () {
                var $input = $(this), settings,
                    onFocusValue;

                // data-* api
                settings = $.extend({}, parameters);
                settings = $.extend(settings, $input.data());

                // Store settings for use with the applyMask method.
                $input.data("settings", settings);


                function getInputSelection() {
                    var el = $input.get(0),
                        start = 0,
                        end = 0,
                        normalizedValue,
                        range,
                        textInputRange,
                        len,
                        endRange;

                    if (typeof el.selectionStart === "number" && typeof el.selectionEnd === "number") {
                        start = el.selectionStart;
                        end = el.selectionEnd;
                    } else {
                        range = document.selection.createRange();

                        if (range && range.parentElement() === el) {
                            len = el.value.length;
                            normalizedValue = el.value.replace(/\r\n/g, "\n");

                            // Create a working TextRange that lives only in the input
                            textInputRange = el.createTextRange();
                            textInputRange.moveToBookmark(range.getBookmark());

                            // Check if the start and end of the selection are at the very end
                            // of the input, since moveStart/moveEnd doesn't return what we want
                            // in those cases
                            endRange = el.createTextRange();
                            endRange.collapse(false);

                            if (textInputRange.compareEndPoints("StartToEnd", endRange) > -1) {
                                start = end = len;
                            } else {
                                start = -textInputRange.moveStart("character", -len);
                                start += normalizedValue.slice(0, start).split("\n").length - 1;

                                if (textInputRange.compareEndPoints("EndToEnd", endRange) > -1) {
                                    end = len;
                                } else {
                                    end = -textInputRange.moveEnd("character", -len);
                                    end += normalizedValue.slice(0, end).split("\n").length - 1;
                                }
                            }
                        }
                    }

                    return {
                        start: start,
                        end: end
                    };
                } // getInputSelection

                function canInputMoreNumbers() {
                    var haventReachedMaxLength = !($input.val().length >= $input.attr("maxlength") && $input.attr("maxlength") >= 0),
                        selection = getInputSelection(),
                        start = selection.start,
                        end = selection.end,
                        haveNumberSelected = (selection.start !== selection.end && $input.val().substring(start, end).match(/\d/)) ? true : false,
                        startWithZero = ($input.val().substring(0, 1) === "0");
                    return haventReachedMaxLength || haveNumberSelected || startWithZero;
                }

                function setCursorPosition(pos) {
                    // Do not set the position if
                    // the we're formatting on blur.
                    // This is because we do not want
                    // to refocus on the control after
                    // the blur.
                    if (!!settings.formatOnBlur) {
                        return;
                    }

                    $input.each(function (index, elem) {
                        if (elem.setSelectionRange) {
                            elem.focus();
                            elem.setSelectionRange(pos, pos);
                        } else if (elem.createTextRange) {
                            var range = elem.createTextRange();
                            range.collapse(true);
                            range.moveEnd("character", pos);
                            range.moveStart("character", pos);
                            range.select();
                        }
                    });
                }

                function maskAndPosition(startPos) {
                    var originalLen = $input.val().length,
                        newLen;
                    $input.val(maskValue($input.val(), settings));
                    newLen = $input.val().length;
                    // If the we're using the reverse option,
                    // do not put the cursor at the end of
                    // the input. The reverse option allows
                    // the user to input text from left to right.
                    if (!settings.reverse) {
                        startPos = startPos - (originalLen - newLen);
                    }
                    setCursorPosition(startPos);
                }

                function mask() {
                    var value = $input.val();
                    // corrected by Kartik for initial empty value being treated as NaN
                    if (settings.allowEmpty && (value === "" || isNaN(parseFloat(value)))) {
                        $input.val("");
                        return;
                    }
                    if (settings.precision > 0 && value.indexOf(settings.decimal) < 0) {
                        value += settings.decimal + new Array(settings.precision + 1).join(0);
                    }
                    $input.val(maskValue(value, settings));
                }

                function changeSign() {
                    var inputValue = $input.val();
                    if (settings.allowNegative) {
                        if (inputValue !== "" && inputValue.charAt(0) === "-") {
                            return inputValue.replace("-", "");
                        } else {
                            return "-" + inputValue;
                        }
                    } else {
                        return inputValue;
                    }
                }

                function preventDefault(e) {
                    if (e.preventDefault) { //standard browsers
                        e.preventDefault();
                    } else { // old internet explorer
                        e.returnValue = false;
                    }
                }

                function keypressEvent(e) {
                    e = e || window.event;
                    var key = e.which || e.charCode || e.keyCode,
                        decimalKeyCode = settings.decimal.charCodeAt(0);
                    //added to handle an IE "special" event
                    if (key === undefined) {
                        return false;
                    }

                    // any key except the numbers 0-9. if we're using settings.reverse,
                    // allow the user to input the decimal key
                    if ((key < 48 || key > 57) && (key !== decimalKeyCode || !settings.reverse)) {
                        return handleAllKeysExceptNumericalDigits(key, e);
                    } else if (!canInputMoreNumbers()) {
                        return false;
                    } else {
                        if (key === decimalKeyCode && shouldPreventDecimalKey()) {
                            return false;
                        }
                        if (settings.formatOnBlur) {
                            return true;
                        }
                        preventDefault(e);
                        applyMask(e);
                        return false;
                    }
                }

                function shouldPreventDecimalKey() {
                    // If all text is selected, we can accept the decimal
                    // key because it will replace everything.
                    if (isAllTextSelected()) {
                        return false;
                    }

                    return alreadyContainsDecimal();
                }

                function isAllTextSelected() {
                    var length = $input.val().length;
                    var selection = getInputSelection();
                    // This should if all text is selected or if the
                    // input is empty.
                    return selection.start === 0 && selection.end === length;
                }

                function alreadyContainsDecimal() {
                    return $input.val().indexOf(settings.decimal) > -1;
                }

                function applyMask(e) {
                    e = e || window.event;
                    var key = e.which || e.charCode || e.keyCode,
                        keyPressedChar = "",
                        selection,
                        startPos,
                        endPos,
                        value;
                    if (key >= 48 && key <= 57) {
                        keyPressedChar = String.fromCharCode(key);
                    }
                    selection = getInputSelection();
                    startPos = selection.start;
                    endPos = selection.end;
                    value = $input.val();
                    $input.val(value.substring(0, startPos) + keyPressedChar + value.substring(endPos, value.length));
                    maskAndPosition(startPos + 1);
                }

                function handleAllKeysExceptNumericalDigits(key, e) {
                    // -(minus) key
                    if (key === 45) {
                        $input.val(changeSign());
                        return false;
                        // +(plus) key
                    } else if (key === 43) {
                        $input.val($input.val().replace("-", ""));
                        return false;
                        // enter key or tab key
                    } else if (key === 13 || key === 9) {
                        return true;
                    } else if ($.browser.mozilla && (key === 37 || key === 39) && e.charCode === 0) {
                        // needed for left arrow key or right arrow key with firefox
                        // the charCode part is to avoid allowing "%"(e.charCode 0, e.keyCode 37)
                        return true;
                    } else { // any other key with keycode less than 48 and greater than 57
                        preventDefault(e);
                        return true;
                    }
                }

                function keydownEvent(e) {
                    e = e || window.event;
                    var key = e.which || e.charCode || e.keyCode,
                        selection,
                        startPos,
                        endPos,
                        value,
                        lastNumber;
                    //needed to handle an IE "special" event
                    if (key === undefined) {
                        return false;
                    }

                    selection = getInputSelection();
                    startPos = selection.start;
                    endPos = selection.end;

                    if (key === 8 || key === 46 || key === 63272) { // backspace or delete key (with special case for safari)
                        preventDefault(e);

                        value = $input.val();

                        // not a selection
                        if (startPos === endPos) {
                            // backspace
                            if (key === 8) {
                                if (settings.suffix === "") {
                                    startPos -= 1;
                                } else {
                                    // needed to find the position of the last number to be erased
                                    lastNumber = value.split("").reverse().join("").search(/\d/);
                                    startPos = value.length - lastNumber - 1;
                                    endPos = startPos + 1;
                                }
                                //delete
                            } else {
                                endPos += 1;
                            }
                        }

                        $input.val(value.substring(0, startPos) + value.substring(endPos, value.length));

                        maskAndPosition(startPos);
                        return false;
                    } else if (key === 9) { // tab key
                        return true;
                    } else { // any other key
                        return true;
                    }
                }

                function focusEvent() {
                    onFocusValue = $input.val();
                    mask();
                    var input = $input.get(0),
                        textRange;

                    if (!!settings.selectAllOnFocus) {
                        input.select();
                    } else if (input.createTextRange) {
                        textRange = input.createTextRange();
                        textRange.collapse(false); // set the cursor at the end of the input
                        textRange.select();
                    }
                }

                function cutPasteEvent() {
                    setTimeout(function () {
                        mask();
                    }, 0);
                }

                function getDefaultMask() {
                    var n = parseFloat("0") / Math.pow(10, settings.precision);
                    return (n.toFixed(settings.precision)).replace(new RegExp("\\.", "g"), settings.decimal);
                }

                function blurEvent(e) {
                    if ($.browser.msie) {
                        keypressEvent(e);
                    }

                    if (!!settings.formatOnBlur && $input.val() !== onFocusValue) {
                        applyMask(e);
                    }

                    if ($input.val() === "" && settings.allowEmpty) {
                        $input.val("");
                    } else if ($input.val() === "" || $input.val() === setSymbol(getDefaultMask(), settings)) {
                        if (!settings.allowZero) {
                            $input.val("");
                        } else if (!settings.affixesStay) {
                            $input.val(getDefaultMask());
                        } else {
                            $input.val(setSymbol(getDefaultMask(), settings));
                        }
                    } else {
                        if (!settings.affixesStay) {
                            var newValue = $input.val().replace(settings.prefix, "").replace(settings.suffix, "");
                            $input.val(newValue);
                        }
                    }
                    if ($input.val() !== onFocusValue) {
                        $input.change();
                    }
                }

                function clickEvent() {
                    var input = $input.get(0),
                        length;
                    if (!!settings.selectAllOnFocus) {
                        // selectAllOnFocus will be handled by
                        // the focus event. The focus event is
                        // also fired when the input is clicked.
                        return;
                    } else if (input.setSelectionRange) {
                        length = $input.val().length;
                        input.setSelectionRange(length, length);
                    } else {
                        $input.val($input.val());
                    }
                }

                function doubleClickEvent() {
                    var input = $input.get(0),
                        start,
                        length;
                    if (input.setSelectionRange) {
                        length = $input.val().length;
                        start = settings.doubleClickSelection ? 0 : length;
                        input.setSelectionRange(start, length);
                    } else {
                        $input.val($input.val());
                    }
                }

                function inputEvent(e) {
                    mask();
                }

                $input.unbind(".maskMoney");

                if ($.browser.mobile) {
                    $input.bind("input.maskMoney", inputEvent);    
                }
                
                $input.bind("keypress.maskMoney", keypressEvent);
                $input.bind("keydown.maskMoney", keydownEvent);
                $input.bind("blur.maskMoney", blurEvent);
                $input.bind("focus.maskMoney", focusEvent);
                $input.bind("click.maskMoney", clickEvent);
                $input.bind("dblclick.maskMoney", doubleClickEvent);
                $input.bind("cut.maskMoney", cutPasteEvent);
                $input.bind("paste.maskMoney", cutPasteEvent);
                $input.bind("mask.maskMoney", mask);
            });
        }
    };

    function setSymbol(value, settings) {
        var operator = "";
        if (value.indexOf("-") > -1) {
            value = value.replace("-", "");
            operator = "-";
        }
        if (value.indexOf(settings.prefix) > -1) {
            value = value.replace(settings.prefix, "");
        }
        if (value.indexOf(settings.suffix) > -1) {
            value = value.replace(settings.suffix, "");
        }
        return operator + settings.prefix + value + settings.suffix;
    }

    function maskValue(value, settings) {
        if (settings.allowEmpty && value === "") {
            return "";
        }
        if (!!settings.reverse) {
            return maskValueReverse(value, settings);
        }
        return maskValueStandard(value, settings);
    }

    /**
     * Modified by Kartik Visweswaran 23-May-2018
     * for correct decimals and precision handling
     */
    function maskValueStandard(value, settings) {
        var v = parseFloat(value);
        if (!isNaN(v)) {
            value = v.toFixed(settings.precision) + '';
        }

        var negative = (value.indexOf("-") > -1 && settings.allowNegative) ? "-" : "",
            onlyNumbers = value.replace(/[^0-9]/g, ""),
            integerPart = onlyNumbers.slice(0, onlyNumbers.length - settings.precision),
            newValue, decimalPart, leadingZeros;

        newValue = buildIntegerPart(integerPart, negative, settings);

        if (settings.precision > 0) {
            decimalPart = onlyNumbers.slice(onlyNumbers.length - settings.precision);
            leadingZeros = new Array((settings.precision + 1) - decimalPart.length).join(0);
            newValue += settings.decimal + leadingZeros + decimalPart;
        }
        return setSymbol(newValue, settings);
    }

    function maskValueReverse(value, settings) {
        var negative = (value.indexOf("-") > -1 && settings.allowNegative) ? "-" : "",
            valueWithoutSymbol = value.replace(settings.prefix, "").replace(settings.suffix, ""),
            integerPart = valueWithoutSymbol.split(settings.decimal)[0],
            newValue,
            decimalPart = "";

        if (integerPart === "") {
            integerPart = "0";
        }
        newValue = buildIntegerPart(integerPart, negative, settings);

        if (settings.precision > 0) {
            var arr = valueWithoutSymbol.split(settings.decimal);
            if (arr.length > 1) {
                decimalPart = arr[1];
            }
            newValue += settings.decimal + decimalPart;
            var rounded = Number.parseFloat((integerPart + "." + decimalPart)).toFixed(settings.precision);
            var roundedDecimalPart = rounded.toString().split(settings.decimal)[1];
            newValue = newValue.split(settings.decimal)[0] + "." + roundedDecimalPart;
        }

        return setSymbol(newValue, settings);
    }

    function buildIntegerPart(integerPart, negative, settings) {
        // remove initial zeros
        integerPart = integerPart.replace(/^0*/g, "");

        // put settings.thousands every 3 chars
        integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, settings.thousands);
        if (integerPart === "") {
            integerPart = "0";
        }
        return negative + integerPart;
    }

    $.fn.maskMoney = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === "object" || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error("Method " + method + " does not exist on jQuery.maskMoney");
        }
    };
})(window.jQuery || window.Zepto);
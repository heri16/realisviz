/**
 * Created by JetBrains PhpStorm.
 * User: admin
 * Date: 26/2/12
 * Time: 10:05 AM
 * To change this template use File | Settings | File Templates.
 */

function getStyleSheet(cssFilename) {
  if (!document.styleSheets) return;

  var i = document.styleSheets.length;
  while (i--) {
    var eachSheet = document.styleSheets[i];
    if (!!eachSheet.href && eachSheet.href.indexOf(cssFilename) != -1) {
      return eachSheet;
    }
  }
}

function getCssRule(styleSheet, cssSelector) {
  if(!styleSheet) return;

  var cssRules = (styleSheet.cssRules ? styleSheet.cssRules : styleSheet.rules);
  var i = cssRules.length;
  while (i--) {
    var eachCssRule = cssRules[i];
    if (eachCssRule.selectorText == cssSelector) {
      return eachCssRule;
    }
  }
}

function modCssRuleProperty(cssRule, cssProperty, cssValue) {
  if(!cssRule) return;

  var cssText = cssRule.style.cssText;

  var regexPatt = new RegExp("(?:" + cssProperty + "\:)[^;]+;", "i");
  if (cssText.match(regexPatt)) {
    cssRule.style.cssText = cssText.replace(regexPatt, cssProperty + ": " + cssValue + ";");
  } else {
    cssRule.style.cssText = cssText + cssProperty + ": " + cssValue + ";";
  }
}

function modCssClassProperty(cssFilename, cssSelector, cssProperty, cssValue) {
  return modCssRuleProperty(getCssRule(getStyleSheet(cssFilename), cssSelector), cssProperty, cssValue)
}
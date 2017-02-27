module.exports.pageUtils = function (text) {
  (function (text) {
    console.log('Page utils injection');
    console.log(text);

    window.__utils__ = {};

    window.__utils__.dispatchMouseEvent = function (type, element) {
      if (element !== null && element !== undefined) {
        someEvent = document.createEvent('MouseEvent');
        someEvent.initEvent(type, true, true);
        element.dispatchEvent(someEvent);
        return true;
      }

      return false;      
    };

    window.__utils__.clickEvent = function (selector) {      
      return window.__utils__.dispatchMouseEvent('click', document.querySelector(selector));
    };

    window.__utils__.mouseupEvent = function (selector) {
      return window.__utils__.dispatchMouseEvent('mouseup', document.querySelector(selector));      
    };

    window.__utils__.mousedownEvent = function (selector) {
      return window.__utils__.dispatchMouseEvent('mousedown', document.querySelector(selector));      
    };

    window.__utils__.clickSelector = function (selector) {
      someElement = document.querySelector(selector);      
      if (someElement !== null) {
        document.activeElement.blur();
        window.__utils__.dispatchMouseEvent('mousedown', someElement);
        window.__utils__.dispatchMouseEvent('mouseup', someElement); 
        window.__utils__.dispatchMouseEvent('click', someElement);
        return true;
      }

      return false;
    };

    window.__utils__.setFocus = function (selector) {
      someElement = document.querySelector(selector);
      if (someElement !== null) {
        someElement.focus();
        return true;
      }

      return false;
    };

    window.__utils__.getRect = function (selector) {
      someElement = document.querySelector(selector);
      if (someElement !== null) {
        elementRect = someElement.getBoundingClientRect();
        return { 
           top:     elementRect.top,
					 bottom:  elementRect.bottom,
					 left:    elementRect.left,
					 right:   elementRect.right,
					 width:   elementRect.right - elementRect.left,
					 height:  elementRect.bottom - elementRect.top
        };
      }

      return false;
    };

    window.__utils__.isHidden = function (element) {
      someStyle = window.getComputedStyle(element);
      return someStyle.display === 'none';
    };   

  })(text);
};
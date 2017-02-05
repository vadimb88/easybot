function dispatchMouseEvent (details) {
var ctrlKey = (/ctrl/i.test(details.modifiers));
  var altKey = (/alt/i.test(details.modifiers));
  var shiftKey = (/shift/i.test(details.modifiers));
  var metaKey = (/meta/i.test(details.modifiers));
  var clickCount = details.clickCount || 1;
  if (details.type == "mousemove")
      clickCount = 0;

  var clientX, clientY, pageX, pageY;
  if (!details.point) {
    var rect = details.target.getBoundingClientRect();
    clientX = Math.round((rect.left+rect.right)/2);
    clientY = Math.round((rect.top+rect.bottom)/2);
    pageX = clientX + details.doc.defaultView.scrollX;
    pageY = clientY + details.doc.defaultView.scrollY;
  } else {
    pageX = details.point.x;
    pageY = details.point.y;
    if ((/HTMLHtmlElement/).test(details.target)) {
      details.target = details.doc.elementFromPoint(pageX, pageY);    
    }
    
    clientX = pageX - details.doc.defaultView.scrollX;
    clientY = pageY - details.doc.defaultView.scrollY;
  }
  
  var screenX = details.doc.defaultView.mozInnerScreenX+clientX;
  var screenY = details.doc.defaultView.mozInnerScreenY+clientY;
  var relatedTarget = null;

  if (details.type == "mousedown") {        
    var mover = details.doc.createEvent("MouseEvent");
    mover.initMouseEvent("mouseover", true, true,
                        details.doc.defaultView, clickCount,
                        screenX, screenY, clientX, clientY,
                        ctrlKey, altKey, shiftKey, metaKey,
                        details.button, relatedTarget);
    details.target.dispatchEvent(mover);
  }

  var event = details.doc.createEvent("MouseEvent");
  event.initMouseEvent(details.type, true, true,
                      details.doc.defaultView,
                      clickCount, screenX, screenY, clientX, clientY,
                      ctrlKey, altKey, shiftKey, metaKey,
                      details.button, relatedTarget);

  details.target.dispatchEvent(event);

  if (details.type == "mousedown") {
    if (typeof details.target.focus == "function")
        details.target.focus();
            
    if ((/HTMLOptionElement/).test(details.target) &&
      (/HTMLSelectElement/).test(details.target.parentNode)) {
      if (!details.target.parentNode.multiple) {
        details.target.parentNode.selectedIndex =
            details.target.index;
      } else {
        details.target.selected = true; 
      }
      
      var change = details.doc.createEvent("Event");
      change.initEvent("change", true, true);
      details.target.dispatchEvent(change);
    }
  } else if (details.type == "mouseup") {
    var click = details.doc.createEvent("MouseEvent");
    click.initMouseEvent(clickCount == 1 ? "click" : "dblclick",
                        true, true,
                        details.doc.defaultView, clickCount,
                        screenX, screenY, clientX, clientY,
                        ctrlKey, altKey, shiftKey, metaKey,
                        details.button, relatedTarget);
    details.target.dispatchEvent(click);
  } 
};

function makeClick (targetObj) {
  var clickDetails = {doc: targetObj.ownerDocument, target: targetObj, button: 0};
  clickDetails.type="mouseover";
  dispatchMouseEvent(clickDetails);
  clickDetails.clickCount = 1;
  clickDetails.type = "mousedown";
  dispatchMouseEvent(clickDetails);
  clickDetails.type = "mouseup";
  dispatchMouseEvent(clickDetails);
};
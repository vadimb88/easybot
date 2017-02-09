'use strict';
require('./utils').polifills();
var Promise = require('./libs/bluebird.min');
var promiseWhile = require('./utils').promiseWhile;
var webpage = require('webpage');
var pageUtils = require('./libs/pageUtils').pageUtils;
var fs = require('fs');

var EVENTS = [''];

var createEventHandler = function (ctx, eventName) {
  return function () {
    console.log('Running ' + eventName + ' handler');
    var deleted = false;
    var args = Array.prototype.slice.apply(arguments);
    if (ctx.handlers[eventName] !== undefined) {    
      ctx.handlers[eventName].forEach(function (handler, ind) { 
        if (handler === null) return;
        
        handler.fn.apply(ctx, args);
        if (handler.once) {
          ctx.handlers[eventName][ind] = null;
          deleted = true;          
        }
      });
    }

    if (deleted) {
      ctx.handlers[eventName] = ctx.handlers[eventName].filter(function(el) { return el !== null});
    }    
  };
};

var EasyBot = function (options) {
  this.queue = Promise.resolve();
  this.page = webpage.create();
  this.handlers = {};
};

EasyBot.prototype.addToQueue = function (cb) {
  this.queue = this.queue.then(cb.bind(this));
  return this;
};

EasyBot.prototype.then = function (cb) {
  this.addToQueue(cb);
  return this;
};

EasyBot.prototype.goto = function (url) {
  var self = this;
  this.queue = this.queue.then(function () {
    return new Promise(function (resolve, reject) { 
      console.log('Starting load url: ' + url);
      self.page.open(url, function (status) {        
        if (status !== 'success') {
          console.log('Unable to access network');
          reject(new Error('Network problems'));
        } else {
          console.log('Page loaded');
          //self.page.injectJs('./libs/pageUtils.js');           
          self.page.evaluate(pageUtils, 'Realy good text');
          resolve(status);
        }   
      });
    });
  });

  return this;
};

EasyBot.prototype.back = function () {
  /* Page goBack function is async but it doesn't take any callbacks.
   * So i wraped it in Promise and resolve this promise after onLoadFinished event.
   */
  
  return this.addToQueue(function () {    
    var self = this;
    console.log('Going back ' + self.page.canGoBack);
    if (!self.page.canGoBack) {
      return false;
    }

    return new Promise(function (resolve, reject) {     
        addEventListenerSync.call(self, 'onLoadFinished', function () { console.log('LOAD FINISHED WITH CALLBACK'); resolve(true); }, true);
        self.page.goBack();          
    });   
  });
};

EasyBot.prototype.forward = function () {
  /* Page goForward function is async but it doesn't take any callbacks.
   * So i wraped it in Promise and resolve this promise after onLoadFinished event.
   */

  return this.addToQueue(function () {    
    var self = this;
    console.log('Going Forward ' + self.page.canGoForward);
    if (!self.page.canGoForward) {
      return false;
    }

    return new Promise(function (resolve, reject) {     
        addEventListenerSync.call(self, 'onLoadFinished', function () { console.log('LOAD FINISHED WITH CALLBACK'); resolve(true); }, true);
        self.page.goForward();          
    });   
  });
};

EasyBot.prototype.refresh = function () {
  /* Page reload function is async but it doesn't take any callbacks.
   * So i wraped it in Promise and resolve this promise after onLoadFinished event.
   */

  return this.addToQueue(function () {    
    var self = this;
    console.log('Reloadind page with url: ' + self.page.url);
    return new Promise(function (resolve, reject) {     
        addEventListenerSync.call(self, 'onLoadFinished', function () { console.log('LOAD FINISHED WITH CALLBACK'); resolve(true); }, true);
        self.page.reload();          
    });   
  }); 
};

var addEventListenerSync = function (type, listener, once) {
  once = once === undefined ? false : once;
  console.log('Adding event Listener for: ' + type);
  if(typeof listener !== 'function') {
    return false;
  }

  if(typeof this.page[type] !== 'function') {
    this.page[type] = createEventHandler(this, type);
  }

  if(this.handlers[type] === undefined) {
    this.handlers[type] = [];
  }

  this.handlers[type].push({ fn: listener, once: once });
  return true;  
};

var removeEventListenerSync = function (type, listener) {  
    console.log('Removing event Listener for: ' + type);
    if(this.handlers[type] === undefined) return true;

    var listenerIndex = this.handlers[type].findIndex(function (el) { console.log('SS ' + el); return el !== null && el.fn === listener; });
    console.log('Listener index: ' + listenerIndex);
    if(listenerIndex !== -1) {
      this.handlers[type].splice(listenerIndex, 1);
    }

    return true; 
};

EasyBot.prototype.addEventListener = function (type, listener, once) {
  once = once === undefined ? false : once;
  return this.addToQueue(function () {
    return addEventListenerSync.call(this, type, listener, once);
  });  
};

EasyBot.prototype.removeEventListener = function (type, listener) {
  return this.addToQueue(function () {
    return removeEventListenerSync.call(this, type, listener);
  });  
};

EasyBot.prototype.scrollTo = function (y, x) {
  return this.evaluate(function (y, x) {
    console.log('Scrolling TO: ' + x + ' ' + y);
    return window.scrollTo(x, y);
  }, y, x);
};

EasyBot.prototype.scrollBy = function (y, x) {
  return this.evaluate(function (y, x) {
    console.log('Scrolling BY: ' + x + ' ' + y);
    return window.scrollBy(x, y);
  }, y, x);
};

var getRect = function (page, selector) {
  return page.evaluate(function (selector) {
    return window.__utils__.getRect(selector);
  }, selector);
};

var getScrollTop = function (page) {
  return page.evaluate(function () {
		return window.pageYOffset; 
	});
};

var getScrollHeight = function (page) {
  return page.evaluate(function () {
    return document.body.scrollHeight;
  });
};

EasyBot.prototype.scrollToSelector = function (selector) {
  return this.addToQueue(function () {    
    var elementRect = getRect(this.page, selector);
    if (elementRect) {
      var elementCenter = elementRect.top + elementRect.height / 2;
      var scrollY = elementCenter - page.viewportSize.height / 2;
      this.page.evaluate(function (y, x) {
        return window.scrollTo(x, y);
      }, scrollY, 0);

      return true;
    }    

    return false;
  });
};

EasyBot.prototype.scrollToSelectorSmooth = function (selector) {
  return this.addToQueue(function () {
    var page = this.page;
    var elementRect = getRect(page, selector);
    if (elementRect) {
      if (elementRect.top >= 0 && elementRect.top <= page.viewportSize.height) {
        return true;
      } else {
        var scrollHeight = getScrollHeight(page);
        var maxScroll    = scrollHeight - page.viewportSize.height;
        var scrollStep   = Math.round(8*page.viewportSize.height/9);
		    var direction    = elementRect.top + elementRect.height/2 >= page.viewportSize.height/2 ? 1 : -1;
		    var heightMargin = page.viewportSize.height/8;
        
        return promiseWhile(function () {
            elementRect = getRect(page, selector);
            var elementCenter = elementRect.top+elementRect.height/2;
            var direction = elementCenter <= page.viewportSize.height/2 ? 1 : -1;
            var scrollTop = getScrollTop(page);          

            return !((elementCenter + heightMargin < page.viewportSize.height && elementCenter - heightMargin > 0) || 
                (scrollTop==0 && elementCenter <= page.viewportSize.height && elementCenter >=0) || 
                (scrollTop==maxScroll && elementCenter <= page.viewportSize.height && elementCenter >= 0));	          
          },

          function () {
            page.evaluate(function(direction, scrollStep, elementRect, heightMargin) {		
              					
              var elementCenter = elementRect.top+elementRect.height/2;
              var clientHeight = document.documentElement.clientHeight;					
              if ((elementCenter > 0 && elementCenter - clientHeight < clientHeight/3) || (elementCenter < 0 && -elementCenter < clientHeight / 3)) {
                console.log("variant 1");
                randomScroll = direction * (Math.floor(Math.random() * 50 + clientHeight * 2 / 3 - 50));
              } else if ((elementCenter > 0 && elementCenter < heightMargin) || (elementCenter < clientHeight && elementCenter > clientHeight - heightMargin)) {
                console.log("variant 2");
                randomScroll = direction * (Math.floor(Math.random() * 50 + 2 * heightMargin - 50));
              } else {
                console.log("variant 3");
                randomScroll = direction * (Math.floor(Math.random() * 50 + scrollStep - 50));
              }

              window.scrollBy(0,randomScroll);
              console.log("scrollstep = " + direction * randomScroll);

            }, direction, scrollStep, elementRect, heightMargin);				
            
            //elementRect = getRect(page, selector);          
            var randomDelay = Math.floor(Math.random() * 60 + 100);
            return Promise.delay(randomDelay);	
          }
        ).then(function () { return true; });
      }
    }

    return false;
  });
};

EasyBot.prototype.setFocus = function (selector) {
  return this.evaluate(function (selector) {
    return window.__utils__.setFocus(selector);
  }, selector);
};

EasyBot.prototype.mousedown = function (selector) {
  return this.evaluate(function (selector) {
    return window.__utils__.mousedownEvent(selector);
  }, selector);
};

EasyBot.prototype.mouseup = function (selector) {
  return this.evaluate(function (selector) {
    return window.__utils__.mouseupEvent(selector);
  }, selector);
};

EasyBot.prototype.mouseover = function (selector) {
  /* Placeholder. Not implemented yet */
  return this;
};

EasyBot.prototype.mouseout = function (selector) {
  /* Placeholder. Not implemented yet */
  return this;
};

EasyBot.prototype.clickEvent = function (selector) {
  return this.evaluate(function (selector) {
    return window.__utils__.clickEvent(selector);
  }, selector);
};

EasyBot.prototype.click = function (selector) {
  return this.evaluate(function (selector) {
    return window.__utils__.clickSelector(selector);
  }, selector);
};

EasyBot.prototype.clickNatural = function (selector) {
  return this.scrollToSelectorSmooth(selector)
  .then(function (status) {
    if(status) {
      var elementRect = getRect(this.page, selector);      
      var elementY = elementRect.top + elementRect.height/2 + Math.round(elementRect.height*(0.5 - Math.random())/15);
		  var elementX = elementRect.left + elementRect.width/2 + Math.round(elementRect.width*(0.5 - Math.random())/15);
      console.log('Clicking element at: ' + elementX + ' ' + elementY);
      page.sendEvent('click', elementX, elementY, 'left');
      return true;
    }
    
    return false;
  });
};

EasyBot.prototype.evaluate = function () {
  var args = Array.prototype.slice.apply(arguments);
  console.log('Arguments ' + args);
  this.addToQueue(function () {
    console.log('Trying to evaluate');
    return this.page.evaluate.apply(this.page, args);
  });

  return this;
};

EasyBot.prototype.type = function (selector, text, options) {
  var clean = options !== undefined && options.clean !== undefined ? options.clean : true;

  return this.evaluate(function (selector, clean) {
    someInput = document.querySelector(selector);
    if (clean) {
      someInput.value = '';
    }

    if (someInput !== null) {
      if (someInput !== document.activeElement) {
        makeClick(someInput);
      }

      return true;
    }
    
    return false;    
  }, selector, clean).then(function (success) {
    console.log('Filling success ' + success);
    this.page.sendEvent('keypress', text);
    return success;
  });
};

EasyBot.prototype.catch = function (errorHandler) {
  this.queue = this.queue.catch(errorHandler.bind(this));
  return this;
};

EasyBot.prototype.delay = function (fromMs, toMs) {
  if (toMs === undefined) {
    this.queue = this.queue.delay(fromMs);
  } else {
    this.queue = this.queue.delay(Math.floor(Math.random() * (toMs - fromMs) + fromMs));
  }
  
  return this;  
};

EasyBot.prototype.getScreenshot = function (fileName) {
  fileName = fileName !== undefined ? fileName : 'screenshot.png';
  this.addToQueue(function () {
    return this.page.render(fileName);
  });

  return this;
};

EasyBot.prototype.getSelectorScreen = function (selector, fileName) {
  fileName = fileName !== undefined ? fileName : 'screenshot.png';  

  return this.evaluate(function (selector) {
    someElement = document.querySelector(selector);
    if(someElement !== null) {
      return someElement.getBoundingClientRect();
    }

    return false;
  }, selector)
  .then(function (elementRect) {
    if (elementRect) {
      var tempRect = this.page.clipRect;
      this.page.clipRect = {
        top:    elementRect.top,
        left:   elementRect.left,
        width:  elementRect.width,
        height: elementRect.height
      };

      this.page.render(fileName);
      this.page.clipRect = tempRect;
      return true;      
    }
    
    return false;
  });
};

EasyBot.prototype.exists = function (selector) {
  this.evaluate(function (selector) {
    return document.querySelector(selector) !== null;
  }, selector);

  return this;
};

EasyBot.prototype.pupup = function () {  
  this.addToQueue(function () { console.log('PUP waiting'); });
  return this;  
};

EasyBot.prototype.pokpok = function () {
  this.addToQueue(function () { console.log('POKPOK waiting'); });
  return this;  
};

EasyBot.prototype.run = function () {  
  return this.queue;
};

exports.create = function (login, password) {
    return new EasyBot();
};
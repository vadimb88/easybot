'use strict';
var Promise      = require('./libs/bluebird.min');
var promiseWhile = require('./utils').promiseWhile;
var Bezier       = require('./utils').Bezier; 
var webpage      = require('webpage');
var pageUtils    = require('./libs/pageUtils').pageUtils;
var fs           = require('fs');
require('./utils').polifills();

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
  this.defaultQueue = 'queue';
  this.page = webpage.create();
  this.standartUseragent = this.page.settings.userAgent;
  this.mouse = {
    x: 0,
    y: 0
  };

  this.handlers = {};
};

EasyBot.prototype.addToQueue = function (cb, queue) {
  /*queue = queue === undefined ? this[this.defaultQueue] : queue;
  queue = queue.then(cb.bind(this));*/
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
  /* 
   * Page goBack function is async but it doesn't take any callbacks.
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
  /*
   * Page goForward function is async but it doesn't take any callbacks.
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
  /* 
   * Page reload function is async but it doesn't take any callbacks.
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
  if (typeof listener !== 'function') {
    return false;
  }

  if (typeof this.page[type] !== 'function') {
    this.page[type] = createEventHandler(this, type);
  }

  if (this.handlers[type] === undefined) {
    this.handlers[type] = [];
  }

  this.handlers[type].push({ fn: listener, once: once });
  return true;  
};

var removeEventListenerSync = function (type, listener) {  
    console.log('Removing event Listener for: ' + type);
    if (this.handlers[type] === undefined) return true;

    var listenerIndex = this.handlers[type].findIndex(function (el) { console.log('SS ' + el); return el !== null && el.fn === listener; });
    console.log('Listener index: ' + listenerIndex);
    if (listenerIndex !== -1) {
      this.handlers[type].splice(listenerIndex, 1);
    }

    return true; 
};

EasyBot.prototype.setHeaders = function (headers, once) {
  once = once === undefined ? false : once;
  return this.addToQueue(function () {
    this.page.customHeaders = headers;

    if (once) {
      addEventListenerSync.call(this, 'onInitialized', function () {        
        this.page.customHeaders = {};       
      }, true);
    }
  });
};

EasyBot.prototype.resetHeaders = function () {
  return this.addToQueue(function () {
    this.page.customHeaders = {};  
  });
};

EasyBot.prototype.setProxy = function (host, port, type, user, password) {
  return this.addToQueue(function () {
    if (typeof host !== 'string') {
      console.log('Setting proxy error: host should be string. Instead got ' + typeof host);
      return false;
    }

    console.log('Setting proxy to ' + host + ':' + port);
    phantom.setProxy(host, port, type, user, password);
    return true;
  });
};

EasyBot.prototype.resetProxy = function () {
  return this.addToQueue(function () {
    console.log('Reseting proxy');
    phantom.setProxy('');
  });
};

EasyBot.prototype.setUseragent = function (useragent) {
  return this.addToQueue(function () {
    if (typeof host !== 'string') {
      console.log('Setting useragent error: useragent should be string. Instead got ' + typeof useragent);
      return false;
    }

    console.log('Setting useragent to: ' + useragent);
    this.page.settings.userAgent = useragent;
    return this.page.settings.userAgent;
  });
};

EasyBot.prototype.resetUseragent = function () {
  return this.addToQueue(function () {
    console.log('Resetting useragent');
    this.page.settings.userAgent = this.standartUseragent;
    return this.page.settings.userAgent;
  });
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
      console.log('Scrolling TO: ' + scrollY);
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
        var scrollStep   = Math.round(8 * page.viewportSize.height / 9);
		    var direction    = elementRect.top + elementRect.height / 2 >= page.viewportSize.height / 2 ? 1 : -1;
		    var heightMargin = page.viewportSize.height / 8;
        
        return promiseWhile(
          function predicate () {
            elementRect = getRect(page, selector);
            var elementCenter = elementRect.top+elementRect.height/2;
            var direction = elementCenter <= page.viewportSize.height/2 ? 1 : -1;
            var scrollTop = getScrollTop(page);          

            return !((elementCenter + heightMargin < page.viewportSize.height && elementCenter - heightMargin > 0) || 
                (scrollTop==0 && elementCenter <= page.viewportSize.height && elementCenter >=0) || 
                (scrollTop==maxScroll && elementCenter <= page.viewportSize.height && elementCenter >= 0));	          
          },

          function action () {
            page.evaluate(function (direction, scrollStep, elementRect, heightMargin) {		              					
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

              window.scrollBy(0, randomScroll);
              console.log("scrollstep = " + direction * randomScroll);

            }, direction, scrollStep, elementRect, heightMargin);				            
        
            var randomDelay = Math.floor(Math.random() * 60 + 100);
            return Promise.delay(randomDelay);	
          }
        ).then(function () { 
          return true;
        });
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

EasyBot.prototype.blur = function () {
  return this.evaluate(function () {
    return document.activeElement.blur();
  });
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

var mouseMoveToXY = function(ctx, x, y) {
  /*
   * Using ctx instead of bind() 
   * I don't want this function to be public and don't want to bind it every time i use it
   */

  ctx.mouse.x = x;
  ctx.mouse.y = y;
  ctx.page.sendEvent('mousemove', x, y);
  return { x: x, y: y };
};

var mouseMoveToXYSmooth = function(ctx, x, y, options) {
  /*
   * Using ctx instead of bind() 
   * I don't want this function to be public and don't want to bind it every time i use it
   */
  var time = options !== undefined && options.time !== undefined ? options.time : 500;   
  var page = ctx.page;
  var wayX = x - ctx.mouse.x;
  var wayY = y - ctx.mouse.y;  
  var stepQuant = options !== undefined && options.steps !== undefined ? options.steps : Math.ceil(Math.sqrt(wayX*wayX + wayY*wayY)*20/(page.viewportSize.height));   
  console.log('MOVING MOUSE');
  console.log("pageX = " + ctx.mouse.x + " pageY = " + ctx.mouse.y);

  if (stepQuant <= 1) {		      
    console.log('Moving to (' + x +',' +y +')');      
    return mouseMoveToXY(ctx, x, y);
  } else {
    var mainPoints = Bezier.getMainPoints([ctx.mouse.x, ctx.mouse.y], [x, y]);
    console.log('MAIN POINTS: ' + mainPoints);
    console.log('STEP: ' + stepQuant);
    var movePoints = Bezier.getBezierCurve(mainPoints, 4/stepQuant);
    var interval = time / (movePoints.length - 1);
    console.log('MOVE POINTS: ' + JSON.stringify(movePoints));
    
    return movePoints
      .reduce(function (queue, point) {   				
        return queue.then(function () {
          console.log('Moving to (' + point[0] +',' +point[1] +')');
          page.sendEvent('mousemove', point[0], point[1]);
        }).delay(interval);
      }, Promise.resolve())
      .then(function () {
        ctx.mouse.x = x;
        ctx.mouse.y = y;
        return { x: x, y: y }; 
      });
  }
};

EasyBot.prototype.mouseMoveTo = function (x, y) {
  return this.addToQueue(function () {   
    return mouseMoveToXY(this, x, y);
  });  
};

EasyBot.prototype.mouseMoveToSelector = function (selector) {
  return this.addToQueue(function () {
    var elementRect = getRect(this.page, selector);
    if (elementRect) {
      var elementY = elementRect.top + elementRect.height/2 + Math.round(elementRect.height*(0.5 - Math.random())/15);
      var elementX = elementRect.left + elementRect.width/2 + Math.round(elementRect.width*(0.5 - Math.random())/15);    
      return mouseMoveToXY(this, elementX, elementY);
    }      
    
    return false;
  });  
};

EasyBot.prototype.mouseMoveToSmooth = function (x, y, options) {
  return this.addToQueue(function () {
    return mouseMoveToXYSmooth(this, x, y, options);    
  });
};

EasyBot.prototype.mouseMoveToSelectorSmooth = function (selector, options) {
  return this.addToQueue(function () {
    var elementRect = getRect(this.page, selector);
    if (elementRect) {
      var elementY = elementRect.top + elementRect.height/2 + Math.round(elementRect.height*(0.5 - Math.random())/15);
      var elementX = elementRect.left + elementRect.width/2 + Math.round(elementRect.width*(0.5 - Math.random())/15);    
      return mouseMoveToXYSmooth(this, elementX, elementY, options);
    }      
    
    return false;
  });
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

EasyBot.prototype.clickSmooth = function (selector) {
  return this
    .scrollToSelectorSmooth(selector)
    .delay(300)
    .mouseMoveToSelector(selector)
    .delay(200)
    .setFocus(selector)
    .then(function (status) {
      if (status) {
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

EasyBot.prototype.if = function (predicate, thenFunc, elseFunc) {
    var startQueue = this.queue;

    return this.addToQueue(function () {
      var self = this;
      return new Promise(function (resolve, reject) {
        var tempQueue = self.queue;
        // Create new queue then add it to old one
        // TODO: Should i create mechanism to better managing of queues?
        self.queue = Promise.resolve();
        var predicateResult = predicate.call(self);
        console.log('predicateResult ' + predicateResult);
        console.log(predicateResult instanceof EasyBot);
        
        // Wrapping result if predicate function returns something but not EasyBot instance. 
        if (predicateResult !== undefined && !(predicateResult instanceof EasyBot)) {
          self.then(function () {
            return predicateResult;
          });
        }

        self.then(function (result) {
          console.log('PREDICATE RESULT ' + result);
          var funcRes;
          if (result && typeof thenFunc === 'function') {        
            funcRes = thenFunc.call(self, result);
          } else if (!result && typeof elseFunc === 'function') {
            funcRes = elseFunc.call(self, result);
          }

          // Wrapping result if callback function returns something but not EasyBot instance
          if (funcRes !== undefined && !(funcRes instanceof EasyBot)) {
            self.then(function () {
              return funcRes;
            });
          }
          
          var endQueue = this.queue;
          this.queue = tempQueue;
          console.log('RETURNING!!!');
          resolve(endQueue);
        }); 
      });
    });
};

EasyBot.prototype.evaluate = function () {
  var args = Array.prototype.slice.apply(arguments);
  this.addToQueue(function () {
    console.log('Trying to evaluate');
    return this.page.evaluate.apply(this.page, args);
  });

  return this;
};

EasyBot.prototype.type = function (selector, text, options) {
  var clean = options !== undefined && options.clean !== undefined ? options.clean : true;

  return this
    .setFocus(selector)
    .delay(100)
    .evaluate(function (selector, clean) {
      someInput = document.querySelector(selector);    
      if (someInput !== null) {
        if (clean) {
          someInput.value = '';
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

EasyBot.prototype.savePage = function (fileName) {
  fileName = fileName !== undefined ? fileName : 'pagecontent.html';
  return this.addToQueue(function () {
    return fs.write(fileName, this.page.content, 'w'); 
  });
};


EasyBot.prototype.getScreenshot = function (fileName) {
  fileName = fileName !== undefined ? fileName : 'screenshot.png';
  return this.addToQueue(function () {
    return this.page.render(fileName);
  });
};

EasyBot.prototype.getSelectorScreen = function (selector, fileName) {
  fileName = fileName !== undefined ? fileName : 'screenshot.png';  

  return this
    .evaluate(function (selector) {
      someElement = document.querySelector(selector);
      if (someElement !== null) {
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
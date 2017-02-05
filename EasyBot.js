'use strict';
var Promise = require('./libs/bluebird.min');
var webpage = require('webpage');
var fs = require('fs');

var EasyBot = function (options) {
  this.queue = Promise.resolve();
  this.page = webpage.create();
};

EasyBot.prototype.addToQueue = function (cb) {
  this.queue = this.queue.then(cb.bind(this));
  return this;
};

EasyBot.prototype.then = function (cb) {
  this.addToQueue(cb);
  return this;
};

EasyBot.prototype.openUrl = function (url) {
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
          self.page.injectJs('./libs/pageUtils.js');           
          resolve(status);
        }   
      });
    });
  });

  return this;
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

EasyBot.prototype.fill = function (selector, text, options) {
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

exports.create = function () {
    return new EasyBot();
};
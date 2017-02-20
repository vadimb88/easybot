exports.polifills = function () {
  if (!Array.prototype.findIndex) {
    Array.prototype.findIndex = function(predicate) {
      if (this == null) {
        throw new TypeError('Array.prototype.findIndex called on null or undefined');
      }

      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      var list = Object(this);
      var length = list.length >>> 0;
      var thisArg = arguments[1];
      var value;

      for (var i = 0; i < length; i++) {
        value = list[i];
        if (predicate.call(thisArg, value, i, list)) {
          return i;
        }
      }
      
      return -1;
    };
  }

  /*if (Promise && !Promise.prototype.delay) {
    Promise.prototype.delay = function (ms) {
      return new Promise(function (resolve, reject) {
        setInterval(resolve.bind(this), ms);
      });
    }  
  }*/
};

exports.promiseWhile = function (predicate, action) {
    function loop (p) {
        if (!predicate()) return p;
        return Promise.resolve(action()).then(loop);
    }

    return Promise.resolve().then(loop);
};

exports.Bezier = {
  factHist: {},
  fact: function (n) {
    if(!this.factHist[n]) {
      this.call++;
      this.factHist[n] = n <= 1 ? 1 : n * this.fact(n - 1);
    }
    return this.factHist[n];
  },

  getBezierBasis: function (i, n, t) {    
    return (this.fact(n) / (this.fact(i) * this.fact(n - i)) )* Math.pow(t, i) * Math.pow(1 - t, n - i);
  },

  getMainPoints: function (point1, point2) {
    if(point2[0] == point1[0]) {
      point2[0] += 3;
    }

    var k = (point2[1] - point1[1]) / (point2[0] - point1[0]); 
    var direction = 1;
    var b = (point2[0] * point1[1] - point1[0] * point2[1]) / (point2[0] - point1[0]); 
    var dx = point2[0] - point1[0];
    var dy = point2[1] - point1[1];
    var points = [];
    points[0] = point1;
    points[1] = [point1[0] + direction * dx/8, k * point1[0] + b + direction * dy / 10];
    points[2] = [point2[0] + direction * dx/8, k * point2[0] + b + direction * dy / 10];
    points[3] = point2;
    return points;
  },

  getBezierCurve: function (arr, step) {
    if (step === undefined) {
        step = 0.2;
    }    

    var res = [];
    step = step / arr.length;
    
    for (var t = 0.0; t < 1 + step; t += step) {
        if (t > 1) {
            t = 1;
        }
        
        var ind = res.length;        
        res[ind] = [0,0];
        
        for (var i = 0; i < arr.length; i++) {
            var b = this.getBezierBasis(i, arr.length - 1, t);            
            res[ind][0] += Math.ceil(arr[i][0] * b);
            res[ind][1] += Math.ceil(arr[i][1] * b);
        }
    }
    
    return res;
  }
};



// arr - массив опорных точек. Точка - двухэлементный массив, (x = arr[0], y = arr[1])
// step - шаг при расчете кривой (0 < step < 1), по умолчанию 0.01. Чем больше шаг - тем грубее кривая



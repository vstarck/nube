// nube.js
// (c) 2011 Valentin Starck
// nube.js may be freely distributed under the MIT license. (see README.md)

var Nube = function (opts) {
    Nube.override(this, opts);

    this.max = {
        x: 0,
        y: this.fontSizeMax
    };

    this.min = {
        x: 0,
        y: this.fontSizeMin
    };
};

Nube.version = '0.1';

Nube.override = function (target, src) {
    if (!src) {
        return target;
    }

    for (var prop in src) {
        if (src.hasOwnProperty(prop)) {
            target[prop] = src[prop];
        }
    }

    return target;
};

Nube.random = function (from, to) {
    return Math.floor(Math.random() * (to - from + 1) + from);
};

Nube.arrayRandom = function (arr) {
    var index;

    index = Nube.random(0, arr.length - 1);

    return arr[index];
};

Nube.prototype.prepareText = function (text) {
    return text.replace(/[,\.]\s/g, ' ');
};

Nube.prototype.tokenize = function (text) {
    var self, result;

    self = this;

    result = this.prepareText(text).split(/\s/g).reduce(function (memo, current) {
        current = current.toLowerCase();

        if (!(current in memo)) {
            memo[current] = { word: current, scale: 0};
        }

        memo[current].scale++;

        return memo;
    }, {});

    var list = [];

    for (var p in result) {
        if (result.hasOwnProperty(p) && this.filter(result[p].word, result[p].scale)) {
            list.push(result[p]);
        }
    }

    list.sort(function (one, another) {
        return one.scale - another.scale;
    });

    this.min = {
        x: list[0].scale,
        y: this.fontSizeMin
    };

    this.max = {
        x: list[list.length - 1].scale,
        y: this.fontSizeMax
    };

    return list;
};

Nube.prototype.createCanvas = function () {
    var canvas = document.createElement('canvas');

    canvas.width = this.width;
    canvas.height = this.height;

    return canvas;
};

Nube.prototype.createFabricInstance = function () {
    var fabricInstance, canvas, element;

    if (this.fabric) {
        return this.fabric;
    }

    canvas = this.createCanvas();
    element = this.wrapper;

    element.appendChild(canvas);

    this.fabric = fabricInstance = new fabric.Canvas(canvas, {
        selection: this.interactive
    });

    fabricInstance.findTarget = (function (originalFn) {
        return function () {
            var target = originalFn.apply(this, arguments);
            if (target) {
                if (this._hoveredTarget !== target) {
                    fabricInstance.fire('object:over', { target: target });
                    if (this._hoveredTarget) {
                        fabricInstance.fire('object:out', { target: this._hoveredTarget });
                    }
                    this._hoveredTarget = target;
                }
            }
            else if (this._hoveredTarget) {
                fabricInstance.fire('object:out', { target: this._hoveredTarget });
                this._hoveredTarget = null;
            }
            return target;
        };
    })(fabricInstance.findTarget);

    return fabricInstance;
};

Nube.prototype.initEvents = function () {
    var self, fabricInstance;

    self = this;
    fabricInstance = this.createFabricInstance();

    fabricInstance.observe('object:over', function (e) {
        self.onHoverIn(e.memo.target, function () {
            fabricInstance.renderAll();
        });
    });

    fabricInstance.observe('object:out', function (e) {
        self.onHoverOut(e.memo.target, function () {
            fabricInstance.renderAll();
        });
    });
};

Nube.prototype.renderTo = function (element) {
    var self, fabricInstance;

    if (element) {
        this.wrapper = element;
    }

    self = this;

    fabricInstance = this.createFabricInstance();

    this.initEvents();

    if (!this.interactive) {
        fabricInstance.HOVER_CURSOR = 'arrow';
    }

    this.addWords(function () {
        (self.onComplete || function () {
        })();
        fabricInstance.renderAll();
    });
};

Nube.prototype.addWords = function (callback) {
    var self, data;

    self = this;
    data = this.data;

    if (!data) {
        data = this.tokenize(this.text);
    }

    Nube.batch(function (data, index) {
        if (!index) throw 'end';

        self.addWord(data[index].word, data[index].scale, data[index]);

        return [data, index - 1];
    }, {
        args: [data, data.length - 1],
        complete: callback,
        step: self.onStep || function () {
        }
    });
};

Nube.prototype.pickFontFamily = function () {
    return Nube.arrayRandom(this.fonts);
};

Nube.prototype.pickColor = function () {
    return Nube.arrayRandom(this.colors);
};

Nube.prototype.pickFontSizeLinear = function (scale) {
    var m, res;

    m = (this.max.y - this.min.y) / (this.max.x - this.min.x);

    res = scale * m + (this.min.y - this.min.x * m);

    return Math.round(res);
};

Nube.prototype.pickFontSizeQuadratic = function (scale) {
    scale = Math.pow(scale / this.max.x, 2);

    return scale * (this.max.y - this.min.y) + this.min.y
};

Nube.prototype.createWord = function (word, scale, record) {
    var angle, fabricObject;

    angle = this.allowRotated ? (Math.random() > .5 ? 0 : -90) : 0;

    fabricObject = new fabric.Text(word, {
        fontFamily: this.pickFontFamily(),
        fontSize: record.fontSize || this.pickFontSizeQuadratic(scale),
        fill: this.pickColor(),
        left: this.width / 2,
        top: this.height / 2,
        angle: angle,
        selectable: this.interactive
    });

    fabricObject.hasControls = this.interactive;
    fabricObject.hasBorders = this.interactive;

    fabricObject.lockRotation = !this.interactive;
    fabricObject.lockScalingX = !this.interactive;
    fabricObject.lockScalingY = !this.interactive;
    fabricObject.lockMovementX = !this.interactive;
    fabricObject.lockMovementY = !this.interactive;

    fabricObject.click = record.click || function () {
    };

    return fabricObject;
};

Nube.prototype.objectsCollide = function (one, another) {
    one = this.getFabricObjectCoords(one);
    another = this.getFabricObjectCoords(another);

    if (one.x1 <= another.x1 && another.x1 <= one.x2) {
        if (one.y1 <= another.y1 && another.y1 <= one.y2) {
            return true;
        }
        if (another.y1 <= one.y1 && one.y1 <= another.y2) {
            return true;
        }
    }

    if (another.x1 <= one.x1 && one.x1 <= another.x2) {
        if (one.y1 <= another.y1 && another.y1 <= one.y2) {
            return true;
        }
        if (another.y1 <= one.y1 && one.y1 <= another.y2) {
            return true;
        }
    }

    return false;
};

Nube.prototype.collides = function (fabricObject) {
    var i, another;

    i = 0;

    while (another = this.fabric.item(i++)) {
        if (fabricObject == another) {
            continue;
        }

        if (this.objectsCollide(fabricObject, another)) {
            return true;
        }
    }

    return false;
};

Nube.prototype.getFabricObjectCoords = function (fabricObject) {
    var isRotated, top, left, height, width, margin;

    isRotated = fabricObject.get('angle') != 0;

    left = fabricObject.get('left');
    top = fabricObject.get('top');

    height = isRotated ? fabricObject.get('width') : fabricObject.get('height');
    width = isRotated ? fabricObject.get('height') : fabricObject.get('width');

    margin = this.setWordMargin(fabricObject.get('text'), fabricObject.get('fontSize'), fabricObject);

    return {
        x1: left - width / 2 - margin.left,
        y1: top - height / 2 - margin.top,
        x2: left + width / 2 + margin.right,
        y2: top + height / 2 + margin.bottom
    };
};

Nube.prototype.setWordPosition = function (fabricText) {
    var top, left, centerY, centerX, seedY, seedX;

    seedY = seedX = 0;
    centerY = this.height / 2;
    centerX = this.width / 2;

    while (this.collides(fabricText)) {
        left = Nube.random(centerX - seedX, centerX + seedX);
        top = Nube.random(centerY - seedY, centerY + seedY);

        fabricText.set({
            left: left,
            top: top
        });

        seedY += this.stepY;
        seedX += this.stepX;
    }

    return fabricText;
};

Nube.prototype.addWord = function (word, scale, record) {
    var fabricText;

    fabricText = this.createWord(word, scale, record);

    this.fabric.add(fabricText);

    this.setWordPosition(fabricText);

    this.fabric.renderAll();
};

Nube.prototype.toDataURL = function () {
    if (this.fabric) {
        return this.fabric.toDataURL();
    }

    return null;
};

// Options
(function (p) {
    p.width = 500;
    p.height = 500;
    p.backgroundColor = '#FFFFFF';
    p.colors = ['#000000', '#FF0000', '#00FF00', '#0000FF'];
    p.fonts = ['CrashCTT_400'];
    p.allowRotated = false;
    p.setWordMargin = function (text, fontSize, fabricObject) {
        return {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0
        };
    };
    p.filter = function (word, count) {
        return true;
    };
    p.stepX = 1;
    p.stepY = 1;
    p.fontSizeMax = 100;
    p.fontSizeMin = 15;
    p.interactive = false;

    p.onHoverIn = function (fabricObject, refresh) {
    };
    p.onHoverOut = function (fabricObject, refresh) {
    };
})(Nube.prototype);

Nube.batch = function (fn, opts) {
    var args, cb, loop, timeout, step;

    opts = opts || {};

    args = opts.args || [];

    cb = opts.complete || function () {
    };
    step = opts.step || function () {
    };

    loop = opts.loop || 100;
    timeout = opts.timeout || 50;

    (function r(args) {
        var i, c, init;

        c = true;
        init = +new Date;

        try {
            while (init + loop > +new Date) {
                args = fn.apply(null, args);
            }
        } catch (e) {
            if (e == 'end') {
                c = false
            } else {
                throw e;
            }
        }

        if (c) {
            step && step.apply(null, args);
            setTimeout(function () {
                r(args);
            }, timeout);
        } else {
            cb.apply(null, args);
        }

    })(args);
};
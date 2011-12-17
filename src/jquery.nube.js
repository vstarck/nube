(function ($) {
    function digest(elements, opts) {
        return elements.map(function () {
            var $this, fontSize, record;

            $this = $(this);

            fontSize = Number($this.css('fontSize').replace(/[^\d\.]/g, ''));

            record = {
                word: $this.html(),
                fontSize: fontSize
            };

            if ($this.is('a')) {
                record.click = function () {
                    if(!opts || opts.preRedirect && opts.preRedirect($this.attr('href'), $this.attr('rel'))) {
                        window.open($this.attr('href'), $this.attr('rel'));
                    }
                };
            }

            return record;
        });
    }

    $.fn.nube = function (opts) {
        var $this, nube, elements, parent;

        opts = opts || {};

        $this = $(this);

        elements = $this.find('*').filter(function () {
            return $(this).children().size() == 0
        });

        opts.data = digest(elements, opts).sort(function (one, another) {
            return one.fontSize - another.fontSize
        });

        opts.allowSelection = true;

        if (!opts.width) {
            opts.width = $this.width();
        }

        if (!opts.height) {
            opts.height = $this.height();
        }

        if (!opts.scaleY) {
            if (opts.height > opts.width) {
                opts.scaleX = 1;
                opts.scaleY = opts.height / opts.width;
            } else {
                opts.scaleX = opts.width / opts.height;
                opts.scaleY = 1;
            }
        }

        nube = new Nube(opts);
        nube.allowSelection = true;

        $.fn.nube.instances.push(nube);

        parent = $this.parent().get(0);

        if (parent) {
            nube.onComplete = function () {
                $(nube.fabric.wrapperEl).show();
                if(opts.hideOriginal) {
                    $this.hide();
                    nube.fabric.calcOffset();
                    nube.fabric.renderAll();
                }
            };

            nube.renderTo(parent);

            $(nube.fabric.wrapperEl).hide();

            nube.fabric.selection = false;
            nube.fabric.selectionBorderColor = 'transparent';
            nube.fabric.selectionColor = 'transparent';
            nube.fabric.selectionLineWidth = 0;

            nube.fabric.HOVER_CURSOR = 'pointer';

            nube.fabric.observe('mouse:down', function (ev) {
                try {
                    ev.memo.target.click();
                } catch (e) {
                }
            })
        }

    };

    $.fn.nube.instances = [];
})(jQuery);
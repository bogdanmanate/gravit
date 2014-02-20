(function (_) {

    /**
     * The base for all path based shapes
     * @class GXPathBase
     * @extends GXShape
     * @constructor
     */
    function GXPathBase() {
        GXShape.call(this);

        this._setDefaultProperties(GXPathBase.VisualProperties);

        // Add anchor points
        this.appendChild(new GXPathBase.AnchorPoints(), true);

        this._vertices = new GXVertexContainer();
        this._verticesDirty = true;
    }

    GObject.inherit(GXPathBase, GXShape);

    /**
     * @enum
     */
    GXPathBase.CornerType = {
        /**
         * A rounded corner
         */
        Rounded: 'R',

        /**
         * An inverse rounded corner
         */
        InverseRounded: 'U',

        /**
         * A beveled corner
         */
        Bevel: 'B',

        /**
         * An inset corner
         */
        Inset: 'I',

        /**
         * A fancy corner
         */
        Fancy: 'F'
    };

    /**
     * Localized names for GXPathBase.CornerType
     */
    GXPathBase.CornerTypeName = {
        'R': new GLocale.Key(GXPathBase, 'corner.rounded'),
        'U': new GLocale.Key(GXPathBase, 'corner.inverse-rounded'),
        'B': new GLocale.Key(GXPathBase, 'corner.bevel'),
        'I': new GLocale.Key(GXPathBase, 'corner.inset'),
        'F': new GLocale.Key(GXPathBase, 'corner.fancy')
    };

    /**
     * The visual properties of a path base with their default values
     */
    GXPathBase.VisualProperties = {
        /** Even-Odd fill */
        evenodd: false
    };

    // -----------------------------------------------------------------------------------------------------------------
    // GXPathBase.AnchorPoint Class
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * @class GXPathBase.AnchorPoint
     * @extends GXNode
     * @mixes GXNode.Properties
     * @constructor
     */
    GXPathBase.AnchorPoint = function () {
        this._setDefaultProperties(GXPathBase.AnchorPoint.GeometryProperties);
        this._leadHr = false;
    };
    GObject.inheritAndMix(GXPathBase.AnchorPoint, GXNode, [GXNode.Properties]);

    /**
     * Take care not to clanch values with GXPathBase.CornerType!
     * @enum
     */
    GXPathBase.AnchorPoint.Type = {
        /**
         * A simple / straight point
         */
        Regular: 'N',

        /**
         * A connector point
         */
        Connector: 'C',

        /**
         * A smooth connection between curves
         */
        Smooth: 'S'
    };

    /**
     * Geometrical properties of an anchor point
     */
    GXPathBase.AnchorPoint.GeometryProperties = {
        /** The type of the anchor point */
        tp: GXPathBase.AnchorPoint.Type.Regular,
        /** The x position */
        x: 0,
        /** The y position */
        y: 0,
        /** The left handle's x position */
        hlx: null,
        /** The left handle's y position */
        hly: null,
        /** The right handle's x position */
        hrx: null,
        /** The right handle's y position */
        hry: null,
        /** Whether handles are auto-calculated or not */
        ah: false,
        /** The left corner length */
        cl: 0,
        /** The right corner length */
        cr: 0
    };

    /**
     * Coefficient, meaning the relevant length of handle in relevance to the distance between points,
     * when handle length should be calculated automatically
     * @type {number}
     */
    GXPathBase.AnchorPoint.HANDLE_COEFF = 0.4;

    /** @override */
    GXPathBase.AnchorPoint.prototype.validateInsertion = function (parent, reference) {
        return parent instanceof GXPathBase.AnchorPoints;
    };

    /**
     * Serializes this point into a stream array
     * @return {Array<*>}
     */
    GXPathBase.AnchorPoint.prototype.serialize = function () {
        var stream = [];

        // Encoding: TYPE | AH | X | Y | 'h' | HLX | HLY | 'H' | HRX | HRY | 'C' | CL | CR
        if (this.$tp !== null && this.$tp !== GXPath.AnchorPoint.GeometryProperties.tp) {
            stream.push(this.$tp);
        }

        if (this.$ah && this.$ah !== GXPath.AnchorPoint.GeometryProperties.ah) {
            stream.push(this.$ah);
        }

        // Lets always serialize x,y properties, as it is a very rare case, when the value is the default (0,0).
        // Just waist of time for check if differ from default, and then again the check on restoring
        stream.push(this.$x);
        stream.push(this.$y);

        // If auto handles are not calculated automatically then save our handles if any
        if (!this.$ah) {
            // If handles are not null, save them even if they have default values,
            // as default value may be not the same as null, and we will need to differ this when deserializing.
            // Also currently the situation of default values is almost impossible for handles (possible only
            // in the case of some error somewhere in the code), so should be no waist of space for storing them
            if (this.$hlx !== null || this.$hly !== null) {
                stream.push('h');
                stream.push(this.$hlx);
                stream.push(this.$hly);
            }
            if (this.$hrx !== null || this.$hry !== null) {
                stream.push('H');
                stream.push(this.$hrx);
                stream.push(this.$hry);
            }
        }

        // Corner shoulder
        if ((this.$cl !== null && !gMath.isEqualEps(this.$cl, GXPath.AnchorPoint.GeometryProperties.cl)) ||
            (this.$cr !== null && !gMath.isEqualEps(this.$cr, GXPath.AnchorPoint.GeometryProperties.cr))) {
            stream.push('C');
            stream.push(this.$cl);
            stream.push(this.$cr);
        }

        return stream;
    };

    /**
     * Deserializes this point from a stream array
     * @param {Array<*>} stream
     */
    GXPathBase.AnchorPoint.prototype.deserialize = function (stream) {
        var index = 0;

        // Read our Type if any
        if (stream.length > 0 && typeof stream[0] === 'string') {
            this.$tp = stream[0];
            index++;
        }

        // Read our auto-handles if any
        if (stream.length > index && typeof stream[index] === 'boolean') {
            this.$ah = stream[index];
            index++;
        }

        // Read coordinates of anchor point
        if (index + 1 < stream.length) {
            this.$x = stream[index];
            this.$y = stream[index + 1];
            index += 2;
        }

        // check of 'index + 2' is needed here, as both x and y are read in one cycle
        while (index + 2 < stream.length) {
            if (stream[index] === 'h') {
                this.$hlx = stream[index + 1];
                this.$hly = stream[index + 2];
            } else if (stream[index] === 'H') {
                this.$hrx = stream[index + 1];
                this.$hry = stream[index + 2];
            } else if (stream[index] === 'C') {
                this.$cl = stream[index + 1];
                this.$cr = stream[index + 2];
            }
            index += 3;
        }
    };

    /**
     * Returns a transformed copy of an anchor point. Only the point coordinates and handles are transformed,
     * but not the shoulders lengths
     * @param {GTransform} transform - a transform to apply
     * @returns {GXPathBase.AnchorPoint} - a transformed copy of an anchor point
     * @private
     */
    GXPathBase.AnchorPoint.prototype._getTransformedCopy = function (transform) {
        var pt = new GXPathBase.AnchorPoint();

        var leftH = this.$hlx !== null ? transform.mapPoint(new GPoint(this.$hlx, this.$hly)) : null;
        var rightH = this.$hrx !== null ? transform.mapPoint(new GPoint(this.$hrx, this.$hry)) : null;
        var coord = transform.mapPoint(new GPoint(this.$x, this.$y));
        pt.$x = coord.getX();
        pt.$y = coord.getY();
        pt.$hlx = leftH ? leftH.getX() : null;
        pt.$hly = leftH ? leftH.getY() : null;
        pt.$hrx = rightH ? rightH.getX() : null;
        pt.$hry = rightH ? rightH.getY() : null;
        pt.$cl = this.$cl;
        pt.$cr = this.$cr;
        pt.$ah = this.$ah;
        pt.$tp = this.$tp;

        return pt;
    };

    /**
     * Returns a left shoulder point for points with set shoulder lengths, or null otherwise
     * @returns {GPoint} a left shoulder point
     */
    GXPathBase.AnchorPoint.prototype.getLeftShoulderPoint = function () {
        if (this._getPath() && this._parent && this.$cl && this.$cr) {
            var prevPt = this._parent.getPreviousPoint(this);
            return this._parent._getLeftShoulderPoint(this, prevPt);
        } else {
            return null;
        }
    };

    /**
     * Returns a left shoulder point for points with set shoulder lengths, or null otherwise
     * Apply a passed transform to points before calculating shoulder point
     * @returns {GPoint} a left shoulder point
     */
    GXPathBase.AnchorPoint.prototype.getLeftShoulderPointTransformed = function (transform) {
        var shoulderPt = null;

        if (this._getPath() && this._parent && this.$cl && this.$cr) {
            var prevPt = this._parent.getPreviousPoint(this);
            var curPtTr = this._getTransformedCopy(transform);
            var prevPtTr = prevPt._getTransformedCopy(transform);
            shoulderPt = this._parent._getLeftShoulderPoint(curPtTr, prevPtTr);
        }

        return shoulderPt;
    };

    /**
     * Returns a right shoulder point for points with set shoulder lengths, or null otherwise
     * @returns {GPoint} a right shoulder point
     */
    GXPathBase.AnchorPoint.prototype.getRightShoulderPoint = function () {
        if (this._getPath() && this._parent && this.$cl && this.$cr) {
            var nextPt = this._parent.getNextPoint(this);
            return this._parent._getRightShoulderPoint(this, nextPt);
        } else {
            return null;
        }
    };

    /**
     * Returns a right shoulder point for points with set shoulder lengths, or null otherwise
     * Apply a passed transform to points before calculating shoulder point
     * @returns {GPoint} a right shoulder point
     */
    GXPathBase.AnchorPoint.prototype.getRightShoulderPointTransformed = function (transform) {
        var shoulderPt = null;

        if (this._getPath() && this._parent && this.$cl && this.$cr) {
            var nextPt = this._parent.getNextPoint(this);
            var curPtTr = this._getTransformedCopy(transform);
            var nextPtTr = nextPt._getTransformedCopy(transform);
            shoulderPt = this._parent._getRightShoulderPoint(curPtTr, nextPtTr);
        }

        return shoulderPt;
    };

    /** @override */
    GXPathBase.AnchorPoint.prototype._handleChange = function (change, args) {
        var path = this._getPath();
        if (change == GXNode._Change.BeforePropertiesChange || change == GXNode._Change.AfterPropertiesChange) {
            if (gUtil.containsObjectKey(args.properties, GXPathBase.AnchorPoint.GeometryProperties)) {
                switch (change) {
                    case GXNode._Change.BeforePropertiesChange:
                        if (path) {
                            path._notifyChange(GXElement._Change.PrepareGeometryUpdate);
                        }
                        break;
                    case GXNode._Change.AfterPropertiesChange:

                        if (this.$tp == GXPathBase.AnchorPoint.Type.Smooth && !this.$ah &&
                            this.$hlx != null && this.$hrx != null) {
                            if ((args.properties.indexOf('hrx') >= 0 ||
                                args.properties.indexOf('hry') >= 0) &&
                                args.properties.indexOf('hlx') < 0 &&
                                args.properties.indexOf('hly') < 0) {

                                this._leadHr = true;
                            } else {
                                this._leadHr = false;
                            }
                        }

                        if (path || // For Smooth point recalculate handles properly, even if point is not inserted yet
                            this.$tp == GXPathBase.AnchorPoint.Type.Smooth && !this.$ah &&
                                this.$hlx != null && this.$hrx != null) {

                            this._invalidateCalculations();
                        }

                        if (path) {
                            // Changes in properties should have the following effect for neighbour points:
                            // handles change - no effect
                            // auto handles flag change - no effect
                            // type change - one point from each side should be updated,
                            //      if it has auto-handles or connector type
                            // coordinate change - one point from each side should be updated,
                            //      if it has auto-handles or connector type, and
                            //      in the case, when the nearest point is smooth, the second point from the side of smooth
                            //      point also should be updated if it has auto-handles

                            if (this._parent) {
                                if (args.properties.indexOf('x') >= 0 ||
                                    args.properties.indexOf('y') >= 0) {

                                    this._parent._invalidateLeft(this._parent.getPreviousPoint(this));
                                    this._parent._invalidateRight(this._parent.getNextPoint(this));
                                } else if (args.properties.indexOf('tp') >= 0) {
                                    var prevPt = this._parent.getPreviousPoint(this);
                                    if (prevPt && (prevPt.$ah || prevPt.$tp == GXPathBase.AnchorPoint.Type.Connector )) {
                                        prevPt._invalidateCalculations();
                                    }
                                    var nextPt = this._parent.getNextPoint(this);
                                    if (nextPt && (nextPt.$ah || nextPt.$tp == GXPathBase.AnchorPoint.Type.Connector )) {
                                        nextPt._invalidateCalculations();
                                    }
                                }
                            }
                            path._verticesDirty = true;
                            path._notifyChange(GXElement._Change.FinishGeometryUpdate);
                        }

                        break;
                }
            }
        }

        GXNode.prototype._handleChange.call(this, change, args);
    };

    /**
     * @returns {GXPathBase}
     * @private
     */
    GXPathBase.AnchorPoint.prototype._getPath = function () {
        return this._parent ? this._parent._parent : null;
    };

    /**
     * Invalidate auto-calculated properties depending on type and other settings
     * Properties have the following priority
     * Connector > Auto > Smooth, Corner
     * @private
     */
    GXPathBase.AnchorPoint.prototype._invalidateCalculations = function () {
        var points = this._parent;

        if (points && this.$tp == GXPathBase.AnchorPoint.Type.Connector) {
            this._calculateConnectorPoint();
        } else if (this.$tp == GXPathBase.AnchorPoint.Type.Smooth && !this.$ah) {
            // recalculate Smooth even if !points
            this._calculateSmoothPoint();
        } else if (points && this.$ah) {
            this._calculateAutoHandles();
        }
    };

    GXPathBase.AnchorPoint.prototype._calculateConnectorPoint = function () {
        var points = this._parent;
        if (points) {

            var prevPt = points.getPreviousPoint(this);
            var nextPt = points.getNextPoint(this);
            var dirLenPrev = 0;
            var dirLenNext = 0;

            if (nextPt) {
                dirLenNext = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, nextPt.$x, nextPt.$y));
            }

            if (prevPt) {
                dirLenPrev = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, prevPt.$x, prevPt.$y));
            }

            var hLen;
            var hx, hy;
            if (this.$ah) {
                if (nextPt && prevPt && nextPt.$tp == GXPathBase.AnchorPoint.Type.Smooth && !gMath.isEqualEps(dirLenNext, 0) && !gMath.isEqualEps(dirLenPrev, 0)) {

                    hLen = dirLenNext * GXPathBase.AnchorPoint.HANDLE_COEFF;
                    hx = this.$x + (this.$x - prevPt.$x) / dirLenPrev * hLen;
                    hy = this.$y + (this.$y - prevPt.$y) / dirLenPrev * hLen;
                    this.setProperties(['hrx', 'hry'], [hx, hy], false, true);
                } else {
                    this.setProperties(['hrx', 'hry'], [null, null], false, true);
                }
                if (prevPt && nextPt && prevPt.$tp == GXPathBase.AnchorPoint.Type.Smooth && !gMath.isEqualEps(dirLenNext, 0) && !gMath.isEqualEps(dirLenPrev, 0)) {

                    hLen = dirLenPrev * GXPathBase.AnchorPoint.HANDLE_COEFF;
                    hx = this.$x + (this.$x - nextPt.$x) / dirLenNext * hLen;
                    hy = this.$y + (this.$y - nextPt.$y) / dirLenNext * hLen;
                    this.setProperties(['hlx', 'hly'], [hx, hy], false, true);
                } else {
                    this.setProperties(['hlx', 'hly'], [null, null], false, true);
                }
            } else {
                if (this.$hlx != null && nextPt && !gMath.isEqualEps(dirLenNext, 0)) {
                    // Use rotation if handle is already set
                    hLen = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, this.$hlx, this.$hly));
                    hx = this.$x + (this.$x - nextPt.$x) / dirLenNext * hLen;
                    hy = this.$y + (this.$y - nextPt.$y) / dirLenNext * hLen;
                    // TODO: use projection in editor when modifying handle
                    //var hnd = gMath.getPositiveProjection(this.$x, this.$y,
                    //    this.$x + (this.$x - nextPt.$x), this.$y + (this.$y - nextPt.$y), this.$hlx, this.$hly);
                    this.setProperties(['hlx', 'hly'], [hx, hy], false, true);
                }

                if (this.$hrx != null && prevPt && !gMath.isEqualEps(dirLenPrev, 0)) {
                    // Use rotation if handle is already set
                    hLen = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, this.$hrx, this.$hry));
                    hx = this.$x + (this.$x - prevPt.$x) / dirLenPrev * hLen;
                    hy = this.$y + (this.$y - prevPt.$y) / dirLenPrev * hLen;
                    // TODO: use projection in editor when modifying handle
                    //var hnd = gMath.getPositiveProjection(this.$x, this.$y,
                    //   this.$x + (this.$x - prevPt.$x), this.$y + (this.$y - prevPt.$y), this.$hrx, this.$hry);
                    this.setProperties(['hrx', 'hry'], [hx, hy], false, true);
                }
            }
        }
    };

    GXPathBase.AnchorPoint.prototype._calculateSmoothPoint = function () {
        var hLen, dirLen;
        var hx, hy;

        // we have two handles, and we need to rotate one of them to be in line with the other
        if (this.$hlx != null && this.$hrx != null) {
            if (this._leadHr) { // the left handle shall be rotated to be in line with the right one
                dirLen = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, this.$hrx, this.$hry));
                if (!gMath.isEqualEps(dirLen, 0)) {
                    hLen = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, this.$hlx, this.$hly));
                    hx = this.$x + (this.$x - this.$hrx) / dirLen * hLen;
                    hy = this.$y + (this.$y - this.$hry) / dirLen * hLen;
                    this.setProperties(['hlx', 'hly'], [hx, hy], false, true);
                }
            } else { // the right handle shall be rotated to be in line with the left one
                dirLen = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, this.$hlx, this.$hly));
                if (!gMath.isEqualEps(dirLen, 0)) {
                    hLen = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, this.$hrx, this.$hry));
                    hx = this.$x + (this.$x - this.$hlx) / dirLen * hLen;
                    hy = this.$y + (this.$y - this.$hly) / dirLen * hLen;
                    this.setProperties(['hrx', 'hry'], [hx, hy], false, true);
                }
            }
        }
    };

    GXPathBase.AnchorPoint.prototype._calculateAutoHandles = function () {
        var points = this._parent;
        if (points) {

            var prevPt = points.getPreviousPoint(this);
            var nextPt = points.getNextPoint(this);

            var hx, hy;
            var dirLen, hLen;
            var offs = GXPathBase.AnchorPoint.HANDLE_COEFF;
            var ccntr;
            var dx, dy;
            var px, py;

            if (this.$tp == GXPathBase.AnchorPoint.Type.Smooth) {
                if (!nextPt && !prevPt) {
                    return;
                } else if (nextPt && !prevPt ||
                    nextPt && this.$x == prevPt.$x && this.$y == prevPt.$y) {

                    hx = this.$x + (nextPt.$x - this.$x) * offs;
                    hy = this.$y + (nextPt.$y - this.$y) * offs;
                    this.setProperties(['hlx', 'hly', 'hrx', 'hry'],
                        [this.$x + this.$x - hx, this.$y + this.$y - hy, hx, hy], false, true);
                } else if (prevPt && !nextPt ||
                    prevPt && this.$x == nextPt.$x && this.$y == nextPt.$y) {

                    hx = this.$x + (prevPt.$x - this.$x) * offs;
                    hy = this.$y + (prevPt.$y - this.$y) * offs;
                    this.setProperties(['hlx', 'hly', 'hrx', 'hry'],
                        [hx, hy, this.$x + this.$x - hx, this.$y + this.$y - hy], false, true);
                } else if (prevPt && nextPt) {
                    // calculate handles to be tangent circle(triag(prevPt, this, nextPt))
                    ccntr = gMath.getCircumcircleCenter(
                        prevPt.$x, prevPt.$y, this.$x, this.$y, nextPt.$x, nextPt.$y);

                    if (ccntr == null) { // prev and next points are the same, make handles to be perpendicular
                        dx = (this.$y - prevPt.$y) * offs;
                        dy = (prevPt.$x - this.$x) * offs;
                        this.setProperties(['hlx', 'hly', 'hrx', 'hry'],
                            [this.$x - dx, this.$y - dy, this.$x + dx, this.$y + dy], false, true);
                    }
                    else {
                        dirLen = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, ccntr.getX(), ccntr.getY()));
                        // no need to check dirLen for 0, as ccntr != this
                        dx = (this.$y - ccntr.getY()) / dirLen;
                        dy = (ccntr.getX() - this.$x) / dirLen;

                        // check handles side
                        px = (prevPt.$x + nextPt.$x) / 2;
                        py = (prevPt.$y + nextPt.$y) / 2;
                        if (gMath.segmentSide(this.$x, this.$y, px, py, prevPt.$x, prevPt.$y) !=
                            gMath.segmentSide(this.$x, this.$y, px, py, this.$x - dx, this.$y - dy)) {
                            dx = -dx;
                            dy = -dy;
                        }

                        hLen = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, prevPt.$x, prevPt.$y)) * offs;
                        this.setProperties(['hlx', 'hly'], [this.$x - dx * hLen, this.$y - dy * hLen], false, true);

                        hLen = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, nextPt.$x, nextPt.$y)) * offs;
                        this.setProperties(['hrx', 'hry'], [this.$x + dx * hLen, this.$y + dy * hLen], false, true);
                    }
                }
            } else { // type != Smooth && type != Connector as this method should not be called for connector
                if (prevPt && (prevPt.$x != this.$x || prevPt.$y != this.$y)) {
                    if (prevPt.$tp == GXPathBase.AnchorPoint.Type.Smooth) {
                        var prevprevPt = points.getPreviousPoint(prevPt);
                        if (!prevprevPt || (prevPt.$x == prevprevPt.$x && prevPt.$y == prevprevPt.$y)) {
                            hx = this.$x + (prevPt.$x - this.$x) * offs;
                            hy = this.$y + (prevPt.$y - this.$y) * offs;
                            this.setProperties(['hlx', 'hly'], [hx, hy], false, true);
                        } else {
                            // calculate left handle to be tangent circle(triag(this, prevPt, prevprevPt))
                            ccntr = gMath.getCircumcircleCenter(
                                this.$x, this.$y, prevPt.$x, prevPt.$y, prevprevPt.$x, prevprevPt.$y);

                            if (ccntr == null) { // this and prevprev points are the same, make handle to be perpendicular
                                dx = (this.$y - prevPt.$y) * offs;
                                dy = (prevPt.$x - this.$x) * offs;
                                this.setProperties(['hlx', 'hly'], [this.$x - dx, this.$y - dy], false, true);
                            }
                            else {
                                dirLen = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, ccntr.getX(), ccntr.getY()));
                                // no need to check dirLen for 0, as ccntr != this
                                dx = (this.$y - ccntr.getY()) / dirLen;
                                dy = (ccntr.getX() - this.$x) / dirLen;

                                // check handle side
                                px = (prevPt.$x + prevprevPt.$x) / 2;
                                py = (prevPt.$y + prevprevPt.$y) / 2;
                                if (gMath.segmentSide(this.$x, this.$y, px, py, prevPt.$x, prevPt.$y) !=
                                    gMath.segmentSide(this.$x, this.$y, px, py, this.$x - dx, this.$y - dy)) {
                                    dx = -dx;
                                    dy = -dy;
                                }

                                hLen = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, prevPt.$x, prevPt.$y)) * offs;
                                this.setProperties(['hlx', 'hly'], [this.$x - dx * hLen, this.$y - dy * hLen], false, true);
                            }
                        }
                    } else { // prevPt.$tp != GXPathBase.AnchorPoint.Type.Smooth
                        this.setProperties(['hlx', 'hly'], [null, null], false, true);
                    }
                }

                if (nextPt && (nextPt.$x != this.$x || nextPt.$y != this.$y)) {
                    if (nextPt.$tp == GXPathBase.AnchorPoint.Type.Smooth) {
                        var nextnextPt = points.getNextPoint(nextPt);
                        if (!nextnextPt || (nextPt.$x == nextnextPt.$x && nextPt.$y == nextnextPt.$y)) {
                            hx = this.$x + (nextPt.$x - this.$x) * offs;
                            hy = this.$y + (nextPt.$y - this.$y) * offs;
                            this.setProperties(['hrx', 'hry'], [hx, hy], false, true);
                        } else {
                            // calculate right handle to be tangent circle(triag(this, nextPt, nextnextPt))
                            ccntr = gMath.getCircumcircleCenter(
                                this.$x, this.$y, nextPt.$x, nextPt.$y, nextnextPt.$x, nextnextPt.$y);

                            if (ccntr == null) { // this and nextnext points are the same, make handle to be perpendicular
                                dx = (this.$y - nextPt.$y) * offs;
                                dy = (nextPt.$x - this.$x) * offs;
                                this.setProperties(['hrx', 'hry'], [this.$x - dx, this.$y - dy], false, true);
                            }
                            else {
                                dirLen = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, ccntr.getX(), ccntr.getY()));
                                // no need to check dirLen for 0, as ccntr != this
                                dx = (this.$y - ccntr.getY()) / dirLen;
                                dy = (ccntr.getX() - this.$x) / dirLen;

                                // check handle side
                                px = (nextPt.$x + nextnextPt.$x) / 2;
                                py = (nextPt.$y + nextnextPt.$y) / 2;
                                if (gMath.segmentSide(this.$x, this.$y, px, py, nextPt.$x, nextPt.$y) !=
                                    gMath.segmentSide(this.$x, this.$y, px, py, this.$x + dx, this.$y + dy)) {
                                    dx = -dx;
                                    dy = -dy;
                                }

                                hLen = Math.sqrt(gMath.ptSqrDist(this.$x, this.$y, nextPt.$x, nextPt.$y)) * offs;
                                this.setProperties(['hrx', 'hry'], [this.$x + dx * hLen, this.$y + dy * hLen], false, true);
                            }
                        }
                    } else {
                        this.setProperties(['hrx', 'hry'], [null, null], false, true);
                    }
                }

            }
        }
    };

    /** @override */
    GXPathBase.AnchorPoint.prototype.toString = function () {
        return "[Object GXPathBase.AnchorPoint]";
    };

    // -----------------------------------------------------------------------------------------------------------------
    // GXPathBase.AnchorPoints Class
    // -----------------------------------------------------------------------------------------------------------------
    /**
     * @class GXPathBase.AnchorPoints
     * @extends GXNode
     * @mixes GXNode.Container
     * @constructor
     */
    GXPathBase.AnchorPoints = function () {
        // AnchorPoints is a "shadow" node
        this._flags |= GXNode.Flag.Shadow;
    };
    GObject.inheritAndMix(GXPathBase.AnchorPoints, GXNode, [GXNode.Container]);

    /**
     * Used for internal calculations.
     * When a point is being removed from container, save here the link to the previous point
     * to invalidate it after removal
     * @type {GXPathBase.AnchorPoint}
     * @private
     */
    GXPathBase.AnchorPoints.prototype._dirtyPrev = null;

    /**
     * Used for internal calculations.
     * When a point is being removed from container, save here the link to the next point
     * to invalidate it after removal
     * @type {GXPathBase.AnchorPoint}
     * @private
     */
    GXPathBase.AnchorPoints.prototype._dirtyNext = null;

    /** @override */
    GXPathBase.AnchorPoints.prototype.validateInsertion = function (parent, reference) {
        return parent instanceof GXPathBase;
    };

    /** @override */
    GXPathBase.AnchorPoints.prototype.validateRemoval = function () {
        return false;
    };

    /**
     * Serializes all points into a stream array
     * @return {Array<*>}
     */
    GXPathBase.AnchorPoints.prototype.serialize = function () {
        var stream = [];
        for (var pt = this.getFirstChild(); pt !== null; pt = pt.getNext()) {
            stream.push(pt.serialize());
        }
        return stream;
    };

    /**
     * Deserializes all points from a stream array
     * @param {Array<*>} stream
     */
    GXPathBase.AnchorPoints.prototype.deserialize = function (stream) {
        for (var i = 0; i < stream.length; ++i) {
            var pt = new GXPathBase.AnchorPoint();
            pt.deserialize(stream[i]);
            this.appendChild(pt, true);
        }
    };

    /**
     * Called when the coordinates of the point at right from the passed point have been changed.
     * Then recalculate carefully the passed point, and the point at left from it if needed.
     * @param {GXPathBase.AnchorPoint} [anchorPt] - the passed point to start recalculations from
     * @private
     */
    GXPathBase.AnchorPoints.prototype._invalidateLeft = function (anchorPt) {
        if (!anchorPt) {
            return;
        }
        // the point should be recalculated if it has auto-handles or connector type.
        // In the case, when it has a smooth type, the left point also should be updated if it has auto-handles
        if (anchorPt.$ah || anchorPt.$tp == GXPathBase.AnchorPoint.Type.Connector) {
            anchorPt._invalidateCalculations();
        }

        if (anchorPt.$tp == GXPathBase.AnchorPoint.Type.Smooth) {
            var leftPt = this.getPreviousPoint(anchorPt);
            if (leftPt && leftPt.$ah) {
                leftPt._invalidateCalculations();
            }
        }
    };

    /**
     * Called when the coordinates of the point at left from the passed point have been changed.
     * Then recalculate carefully the passed point, and the point at right from it if needed.
     * @param {GXPathBase.AnchorPoint} [anchorPt] - the passed point to start recalculations from
     * @private
     */
    GXPathBase.AnchorPoints.prototype._invalidateRight = function (anchorPt) {
        if (!anchorPt) {
            return;
        }
        // the point should be recalculated if it has auto-handles or connector type.
        // In the case, when it has a smooth type, the right point also should be updated if it has auto-handles
        if (anchorPt.$ah || anchorPt.$tp == GXPathBase.AnchorPoint.Type.Connector) {
            anchorPt._invalidateCalculations();
        }

        if (anchorPt.$tp == GXPathBase.AnchorPoint.Type.Smooth) {
            var rightPt = this.getNextPoint(anchorPt);
            if (rightPt && rightPt.$ah) {
                rightPt._invalidateCalculations();
            }
        }
    };

    /**
     * Called to generate vertices from this anchor points
     * @param {GXVertexTarget} target the target vertex container to put vertices into
     * @param {GTransform} transform the transformation used for vertice generation, might be null
     * @param {Boolean} styled - indicates if vertices should be calculated for path with styled corners
     * @private
     */
    GXPathBase.AnchorPoints.prototype._generateVertices = function (target, transform, styled) {
        var i;
        var pt;
        var startPtX, startPtY;
        var ap;

        // First vertex
        // Do not process first anchor point corner here,
        // just calculate a path starting point on the way to the next anchor point
        ap = this.getFirstChild();
        if (!ap) {
            return;
        }

        var path = this._parent;
        var aptmp;
        if (!styled ||
            ap.$tp == GXPathBase.AnchorPoint.Type.Regular ||
            ap.$tp == GXPathBase.AnchorPoint.Type.Connector ||
            ap.$tp == GXPathBase.AnchorPoint.Type.Smooth || !path || !path.$closed ||
            ap == this.getLastChild()) {

            if (transform) {
                aptmp = ap._getTransformedCopy(transform);
            } else {
                aptmp = ap;
            }
            startPtX = aptmp.$x;
            startPtY = aptmp.$y;
        } else {
            pt = this._getPathStartPt(transform);
            startPtX = pt.getX();
            startPtY = pt.getY();
        }

        target.addVertex(GXVertex.Command.Move, startPtX, startPtY);
        if (ap == this.getLastChild()) {
            return;
        }

        // Add all the vertices (including corners for the last point and the first point for closed path),
        // except the vertices for the last point of open path
        var prevPt = ap;
        ap = ap.getNext();
        var firstPt = ap;
        var processingStarted = false;
        var nextPt = this.getNextPoint(ap);
        var prevPttmp, nextPttmp;
        if (transform) {
            aptmp = ap._getTransformedCopy(transform);
            prevPttmp = prevPt._getTransformedCopy(transform);
        }
        while (nextPt && (ap != firstPt || !processingStarted)) {
            processingStarted = true;
            if (transform) {
                nextPttmp = nextPt._getTransformedCopy(transform);

                this._addMiddleVertices(
                    target, aptmp, prevPttmp, nextPttmp, styled);

                prevPttmp = aptmp;
                aptmp = nextPttmp;
            } else {
                this._addMiddleVertices(
                    target, ap, prevPt, nextPt, styled);
            }

            prevPt = ap;
            ap = nextPt;
            nextPt = this.getNextPoint(nextPt);
        }

        // the last point, !path.$closed
        if (!nextPt) {
            this._addPathEndVertices(target, transform);
        }
    };

    /**
     * Calculates and return the first vertex of the path, from which movement to the next point starts
     * Takes into account corner type
     * This function is supposed to be called only when the path is closed
     * @param {GTransform} transform - a transformation to apply to anchor points before generating vertices
     * @returns {GPoint} starting point of the path
     * @private
     */
    GXPathBase.AnchorPoints.prototype._getPathStartPt = function (transform) {
        var ap = this.getFirstChild();
        var prevPt = this.getPreviousPoint(ap);
        var nextPt = this.getNextPoint(ap);

        if (transform) {
            ap = ap._getTransformedCopy(transform);
            nextPt = nextPt._getTransformedCopy(transform);
            prevPt = prevPt._getTransformedCopy(transform);
        }

        // no second corner shoulder
        if (!ap.$cl || !ap.$cr ||
            // specific corner type is not set
            ap.$tp == GXPathBase.AnchorPoint.Type.Regular ||
            // the point is connector or smooth, no corner here
            ap.$tp == GXPathBase.AnchorPoint.Type.Connector ||
            ap.$tp == GXPathBase.AnchorPoint.Type.Smooth || !prevPt ||
            prevPt.$tp == GXPathBase.AnchorPoint.Type.Connector && prevPt.$x == ap.$x && prevPt.$y == ap.$y) {

            return new GPoint(ap.$x, ap.$y);
        }

        return this._getRightShoulderPoint(ap, nextPt);
    };

    /**
     * Calculates the point at which styled corner shoulder should finish or start, taken into account that
     * near points may have total shoulders length more than the distance between points
     * @param {Number} [pt1x] - x-coordinate of the first point
     * @param {Number} [pt1y] - y-coordinate of the first point
     * @param {Number} [pt1s] - shoulder of the first point
     * @param {Number} [pt2x] - x-coordinate of the second point
     * @param {Number} [pt2y] - y-coordinate of the second point
     * @param {Number} [pt2s] - shoulder of the second point
     * @return {GPoint} the shoulder end connected to the first point
     * @private
     */
    GXPathBase.AnchorPoints.prototype._getShoulderPoint = function (pt1x, pt1y, pt1s, pt2x, pt2y, pt2s) {
        var dist = gMath.ptDist(pt1x, pt1y, pt2x, pt2y);
        var sptdst;
        var p1s, p2s;
        if (pt1s == null || pt1s <= 0) {
            p1s = 0;
        } else {
            p1s = pt1s;
        }
        if (pt2s == null || pt2s <= 0) {
            p2s = 0;
        } else {
            p2s = pt2s;
        }
        var len = p1s + p2s;
        if (len <= 0) {
            return null;
        }
        if (dist >= len) {
            sptdst = p1s;
        } else {
            sptdst = dist * p1s / len;
        }
        return gMath.getPointAtLength(pt1x, pt1y, pt2x, pt2y, sptdst);
    };

    /**
     * Returns a right shoulder point for the passed point, using the second passed point as a near point at right
     * @param {GXPathBase.AnchorPoint} [curPt] the current anchor point for which shoulder is needed
     * @param {GXPathBase.AnchorPoint} [nextPt] an anchor point to be use as a near point at right
     * @returns {GPoint} a left shoulder point
     */
    GXPathBase.AnchorPoints.prototype._getRightShoulderPoint = function (curPt, nextPt) {
        // define corner end
        var hx = null;
        var hy = null;
        if (curPt.$hrx != null) {
            hx = curPt.$hrx;
            hy = curPt.$hry;
        } else if (nextPt.$hlx != null) {
            hx = nextPt.$hlx;
            hy = nextPt.$hly;
        }
        var pt;
        if (hx != null) {
            pt = gMath.getPointAtLength(curPt.$x, curPt.$y, hx, hy, curPt.$cr);
        } else {
            pt = this._getShoulderPoint(curPt.$x, curPt.$y, curPt.$cr, nextPt.$x, nextPt.$y, nextPt.$cl);
        }
        return pt;
    };

    /**
     * Returns a left shoulder point for the passed point, using the second passed point as a near point at left
     * @param {GXPathBase.AnchorPoint} [curPt] the current anchor point for which shoulder is needed
     * @param {GXPathBase.AnchorPoint} [prevPt] an anchor point to be use as a near point at left
     * @returns {GPoint} a left shoulder point
     */
    GXPathBase.AnchorPoints.prototype._getLeftShoulderPoint = function (curPt, prevPt) {
        // define corner end
        var hx = null;
        var hy = null;
        if (curPt.$hlx != null) {
            hx = curPt.$hlx;
            hy = curPt.$hly;
        } else if (prevPt.$hrx != null) {
            hx = prevPt.$hrx;
            hy = prevPt.$hry;
        }
        var pt;
        if (hx != null) {
            pt = gMath.getPointAtLength(curPt.$x, curPt.$y, hx, hy, curPt.$cl);
        } else {
            pt = this._getShoulderPoint(curPt.$x, curPt.$y, curPt.$cl, prevPt.$x, prevPt.$y, prevPt.$cr);
        }
        return pt;
    };

    /**
     * Calculate and adds vertices for anchor point
     * Anchor point type is taken into account only if styled corner is needed
     * @param {GXVertexTarget} target the target vertex container to put vertices into
     * @param {GXPathBase.AnchorPoint} [curPt] the current anchor point, used as a main source for segment and corner vertices
     * @param {GXPathBase.AnchorPoint} [prevPt] the previous anchor point, used to correct vertices according to corner type
     * @param {GXPathBase.AnchorPoint} [nextPt] the next anchor point, used to correct vertices according to corner type
     * @param {Boolean} [styled] used to indicate if styled corner is needed
     * @private
     */
    GXPathBase.AnchorPoints.prototype._addMiddleVertices = function (target, curPt, prevPt, nextPt, styled) {
        var hLen, dirLen;
        var h2x = null;
        var h2y = null;
        var pt, pt2;
        var hx = null;
        var hy = null;

        // define first and second handle coordinates if exist
        if (curPt.$hlx != null && prevPt.$hrx != null) {
            hx = prevPt.$hrx;
            hy = prevPt.$hry;
            h2x = curPt.$hlx;
            h2y = curPt.$hly;
        } else if (curPt.$hlx != null) {
            hx = curPt.$hlx;
            hy = curPt.$hly;
        } else if (prevPt.$hrx != null) {
            hx = prevPt.$hrx;
            hy = prevPt.$hry;
        }

        // define curve end point and other corner points if applicable
        if (!styled ||
            curPt.$tp == GXPathBase.AnchorPoint.Type.Regular ||
            curPt.$tp == GXPathBase.AnchorPoint.Type.Connector ||
            curPt.$tp == GXPathBase.AnchorPoint.Type.Smooth ||
            // shoulders are not defined or zero
            !curPt.$cl || !curPt.$cr) {
            // No any specific corner with shoulders

            if (hx == null) {
                target.addVertex(GXVertex.Command.Line, curPt.$x, curPt.$y);
            } else if (h2x == null) {
                target.addVertex(GXVertex.Command.Curve, curPt.$x, curPt.$y);
                target.addVertex(GXVertex.Command.Curve, hx, hy);
            } else {
                target.addVertex(GXVertex.Command.Curve2, curPt.$x, curPt.$y);
                target.addVertex(GXVertex.Command.Curve2, hx, hy);
                target.addVertex(GXVertex.Command.Curve2, h2x, h2y);
            }
        } else { // corner with shoulders
            if (hx == null) {
                pt = this._getShoulderPoint(curPt.$x, curPt.$y, curPt.$cl, prevPt.$x, prevPt.$y, prevPt.$cr);
                target.addVertex(GXVertex.Command.Line, pt.getX(), pt.getY());
            } else if (h2x == null) {
                pt = gMath.getPointAtLength(curPt.$x, curPt.$y, hx, hy, curPt.$cl);
                target.addVertex(GXVertex.Command.Curve, pt.getX(), pt.getY());
                target.addVertex(GXVertex.Command.Curve, hx, hy);
            } else {
                pt = gMath.getPointAtLength(curPt.$x, curPt.$y, h2x, h2y, curPt.$cl);
                target.addVertex(GXVertex.Command.Curve2, pt.getX(), pt.getY());
                target.addVertex(GXVertex.Command.Curve2, hx, hy);
                target.addVertex(GXVertex.Command.Curve2, h2x, h2y);
            }

            pt2 = this._getRightShoulderPoint(curPt, nextPt);

            this._addCornerToVertices(
                target, pt.getX(), pt.getY(), pt2.getX(), pt2.getY(), curPt.$x, curPt.$y, curPt.$tp);
        }
    };

    /**
     * Adds extra (corner) vertices to _vertices
     * @param {GXVertexTarget} target the target vertex container to put vertices into
     * @param {Number} [pt1x] x coordinate of a corner start point
     * @param {Number} [pt1y] y coordinate of a corner start point
     * @param {Number} [pt2x] x coordinate of a corner end point
     * @param {Number} [pt2y] y coordinate of a corner end point
     * @param {Number} [edgePtx] x coordinate of a corner anchor point
     * @param {Number} [edgePty] y coordinate of a corner anchor point
     * @param {Number} [edgePtType] a type of of a corner anchor point
     * @private
     */
    GXPathBase.AnchorPoints.prototype._addCornerToVertices = function (target, pt1x, pt1y, pt2x, pt2y, edgePtx, edgePty, edgePtType) {

        var endPtX, endPtY, chunk1X, chunk1Y, chunk2X, chunk2Y;
        var edgeForInsetX, edgeForInsetY;
        var edgeForArcX, edgeForArcY;

        if (pt1x == pt2x && pt1y == pt2y) {
            if (edgePtx != pt1x || edgePty != pt1y) {
                target.addVertex(GXVertex.Command.Line, edgePtx, edgePty);
                target.addVertex(GXVertex.Command.Line, pt2x, pt2y);
            }
            return;
        }

        if (pt1x == edgePtx && pt1y == edgePty || pt2x == edgePtx && pt2y == edgePty) {
            target.addVertex(GXVertex.Command.Line, pt2x, pt2y);
            return;
        }

        if (edgePtType == GXPathBase.CornerType.Rounded ||
            edgePtType == GXPathBase.CornerType.InverseRounded) {
            if ((pt1x == pt2x && pt1x == edgePtx) || (pt1y == pt2y && pt1y == edgePty)) {
                target.addVertex(GXVertex.Command.Curve, pt2x, pt2y);
                target.addVertex(GXVertex.Command.Curve, edgePtx, edgePty);
            } else {
                // TODO: may be check angle, and if == 90, create properly rounded arc instead of quadratic curve,
                // see code example at coconut:QCDrawPathWorkerImpl.cpp: QCDrawPathWorkerImpl::addStyledEdge
                if (edgePtType == GXPathBase.CornerType.Rounded) {
                    edgeForArcX = edgePtx;
                    edgeForArcY = edgePty;
                } else { // edgePtType == GXPathBase.AnchorPoint.Type.InverseRounded
                    edgeForArcX = pt1x + pt2x - edgePtx;
                    edgeForArcY = pt1y + pt2y - edgePty;
                }
                target.addVertex(GXVertex.Command.Curve, pt2x, pt2y);
                target.addVertex(GXVertex.Command.Curve, edgeForArcX, edgeForArcY);
            }
        } else if (edgePtType == GXPathBase.CornerType.Fancy) {
            chunk1X = (pt2x - edgePtx) / 3;
            chunk1Y = (pt2y - edgePty) / 3;
            chunk2X = (edgePtx - pt1x) / 3;
            chunk2Y = (edgePty - pt1y) / 3;

            endPtX = pt1x + 2 * chunk1X;
            endPtY = pt1y + 2 * chunk1Y;
            target.addVertex(GXVertex.Command.Line, endPtX, endPtY);

            endPtX += 2 * chunk2X;
            endPtY += 2 * chunk2Y;
            target.addVertex(GXVertex.Command.Line, endPtX, endPtY);

            endPtX -= chunk1X;
            endPtY -= chunk1Y;
            target.addVertex(GXVertex.Command.Line, endPtX, endPtY);

            endPtX -= chunk2X;
            endPtY -= chunk2Y;
            target.addVertex(GXVertex.Command.Line, endPtX, endPtY);

            endPtX += 2 * chunk1X;
            endPtY += 2 * chunk1Y;
            target.addVertex(GXVertex.Command.Line, endPtX, endPtY);

            endPtX += 2 * chunk2X;
            endPtY += 2 * chunk2Y;
            target.addVertex(GXVertex.Command.Line, endPtX, endPtY);

        } else if (edgePtType == GXPathBase.CornerType.Bevel) {
            target.addVertex(GXVertex.Command.Line, pt2x, pt2y);

        } else if (edgePtType == GXPathBase.CornerType.Inset) {
            edgeForInsetX = pt1x + pt2x - edgePtx;
            edgeForInsetY = pt1y + pt2y - edgePty;

            target.addVertex(GXVertex.Command.Line, edgeForInsetX, edgeForInsetY);
            target.addVertex(GXVertex.Command.Line, pt2x, pt2y);

        } else {   // use GXPathBase.AnchorPoint.Type.Regular for all the unsupported types
            target.addVertex(GXVertex.Command.Line, edgePtx, edgePty);
            target.addVertex(GXVertex.Command.Line, pt2x, pt2y);
        }
    };

    /**
     * Adds path end vertices to the _vertices container, used to finish path
     * This function is supposed to be called only when the path is NOT closed
     * @param {GXVertexTarget} target the target vertex container to put vertices into
     * @param {GTransform} transform - a transformation to apply to anchor points before generating vertices
     * @private
     */
    GXPathBase.AnchorPoints.prototype._addPathEndVertices = function (target, transform) {
        var hx, hy;
        var endPt = this.getLastChild();
        var prevPt = endPt.getPrevious();

        if (transform) {
            endPt = endPt._getTransformedCopy(transform);
            prevPt = prevPt._getTransformedCopy(transform);
        }

        if (endPt.$hlx != null && prevPt.$hrx != null) {
            target.addVertex(GXVertex.Command.Curve2, endPt.$x, endPt.$y);
            target.addVertex(GXVertex.Command.Curve2, prevPt.$hrx, prevPt.$hry);
            target.addVertex(GXVertex.Command.Curve2, endPt.$hlx, endPt.$hly);
        } else if (endPt.$hlx == null && prevPt.$hrx == null) {
            target.addVertex(GXVertex.Command.Line, endPt.$x, endPt.$y);
        } else {
            if (endPt.$hlx != null) {
                hx = endPt.$hlx;
                hy = endPt.$hly;
            } else {
                hx = prevPt.$hrx;
                hy = prevPt.$hry;
            }
            target.addVertex(GXVertex.Command.Curve, endPt.$x, endPt.$y);
            target.addVertex(GXVertex.Command.Curve, hx, hy);
        }
    };

    /** @override */
    GXPathBase.AnchorPoints.prototype._handleChange = function (change, args) {
        var path = this._parent;

        if (path) {
            var prevPt, nextPt;
            var anchorPoint = args;
            var hx, hy;

            if (change == GXNode._Change.BeforeChildInsert) {
                if (this.getParent()) {
                    this.getParent().beginUpdate();
                }
            } else if (change == GXNode._Change.AfterChildInsert) {
                prevPt = this.getPreviousPoint(anchorPoint);
                if (prevPt && prevPt.$hrx != null && anchorPoint.$tp == GXPathBase.AnchorPoint.Type.Connector) {
                    hx = anchorPoint.$x + (prevPt.$x - anchorPoint.$x) * GXPathBase.AnchorPoint.HANDLE_COEFF;
                    hy = anchorPoint.$y + (prevPt.$y - anchorPoint.$y) * GXPathBase.AnchorPoint.HANDLE_COEFF;
                    if (!gMath.isEqualEps(anchorPoint.$x - hx, 0) || !gMath.isEqualEps(anchorPoint.$y - hy, 0)) {
                        anchorPoint.setProperties(['hlx', 'hly'], [hx, hy]);
                    }
                }

                nextPt = this.getNextPoint(anchorPoint);
                if (nextPt && nextPt.$hlx != null && anchorPoint.$tp == GXPathBase.AnchorPoint.Type.Connector) {
                    hx = anchorPoint.$x + (nextPt.$x - anchorPoint.$x) * GXPathBase.AnchorPoint.HANDLE_COEFF;
                    hy = anchorPoint.$y + (nextPt.$y - anchorPoint.$y) * GXPathBase.AnchorPoint.HANDLE_COEFF;
                    if (!gMath.isEqualEps(anchorPoint.$x - hx, 0) || !gMath.isEqualEps(anchorPoint.$y - hy, 0)) {
                        anchorPoint.setProperties(['hrx', 'hry'], [hx, hy]);
                    }
                }

                if (anchorPoint.$ah ||
                    anchorPoint.$tp == GXPathBase.AnchorPoint.Type.Connector) {

                    anchorPoint._invalidateCalculations();
                }
                this._invalidateLeft(prevPt);
                this._invalidateRight(nextPt);

                if (this.getParent()) {
                    this.getParent().endUpdate();
                }
            } else if (change == GXNode._Change.BeforeChildRemove) {
                if (this.getParent()) {
                    this.getParent().beginUpdate();
                }
                this._dirtyPrev = this.getPreviousPoint(anchorPoint);
                this._dirtyNext = this.getNextPoint(anchorPoint);
            } else if (change == GXNode._Change.AfterChildRemove) {
                if (this._dirtyPrev) {
                    this._invalidateLeft(this._dirtyPrev);
                }
                if (this._dirtyNext) {
                    this._invalidateRight(this._dirtyNext);
                }

                if (this.getParent()) {
                    this.getParent().endUpdate();
                }
            }
        }

        if (path && (change == GXNode._Change.AfterChildInsert || change == GXNode._Change.AfterChildRemove)) {
            // Notify path parent about the change
            path._notifyChange(GXElement._Change.PrepareGeometryUpdate);
            path._verticesDirty = true;
            path._notifyChange(GXElement._Change.FinishGeometryUpdate);
        }

        GXNode.prototype._handleChange.call(this, change, args);
    };

    /**
     * Get next point from given source point
     * @param {GXPathBase.AnchorPoint} source
     * @private
     */
    GXPathBase.AnchorPoints.prototype.getNextPoint = function (source) {
        var nextPt = source ? source.getNext() : null;
        if (!nextPt && this._parent && this._parent.$closed && source == this.getLastChild()) {
            nextPt = this.getFirstChild();
        }
        return nextPt;
    };

    /**
     * Get previous point from given source point
     * @param {GXPathBase.AnchorPoint} source
     * @private
     */
    GXPathBase.AnchorPoints.prototype.getPreviousPoint = function (source) {
        var prevPt = source ? source.getPrevious() : null;
        if (!prevPt && this._parent && this._parent.$closed && source == this.getFirstChild()) {
            prevPt = this.getLastChild();
        }
        return prevPt;
    };

    /**
     * Get last related point from given source point
     * @param {GXPathBase.AnchorPoint} source
     * @private
     */
    GXPathBase.AnchorPoints.prototype.getLastRelatedPoint = function (source) {
        var lastRelPt = source;
        var nextPt = this.getNextPoint(source);
        if (nextPt) {
            lastRelPt = nextPt;
            if (nextPt.$tp == GXPathBase.AnchorPoint.Type.Smooth) {
                var nextnextPt = this.getNextPoint(nextPt);
                if (nextnextPt && nextnextPt.$ah && nextnextPt != source) {
                    lastRelPt = nextnextPt;
                }
            }
        }

        return lastRelPt;
    };

    /**
     * Get first related point from given source point
     * @param {GXPathBase.AnchorPoint} source
     * @private
     */
    GXPathBase.AnchorPoints.prototype.getFirstRelatedPoint = function (source) {
        var firstRelPt = source;
        var prevPt = this.getPreviousPoint(source);
        if (prevPt) {
            firstRelPt = prevPt;
            if (prevPt.$tp == GXPathBase.AnchorPoint.Type.Smooth) {
                var prevprevPt = this.getPreviousPoint(prevPt);
                if (prevprevPt && prevprevPt.$ah && prevprevPt != source) {
                    firstRelPt = prevprevPt;
                }
            }
        }

        return firstRelPt;
    };

    /** @override */
    GXPathBase.AnchorPoints.prototype.toString = function () {
        return "[Object GXPathBase.AnchorPoints]";
    };

    // -----------------------------------------------------------------------------------------------------------------
    // GXPathBase Class
    // -----------------------------------------------------------------------------------------------------------------

    /**
     * @type {GXVertexContainer}
     * @private
     */
    GXPathBase.prototype._vertices = null;

    /**
     * @type {boolean}
     * @private
     */
    GXPathBase.prototype._verticesDirty = false;

    /** @override */
    GXPathBase.prototype.rewindVertices = function (index) {
        if (this._verticesDirty || this._vertices == null || this._vertices.getCount() == 0) {
            this._vertices.clearVertices();
            this._getAnchorPoints()._generateVertices(this._vertices, this.$transform, true);
            this._verticesDirty = false;
        }
        return this._vertices.rewindVertices(index);
    };

    /** @override */
    GXPathBase.prototype.readVertex = function (vertex) {
        return this._vertices.readVertex(vertex);
    };

    /** @override */
    GXPathBase.prototype.store = function (blob) {
        if (GXShape.prototype.store.call(this, blob)) {
            this.storeProperties(blob, GXPathBase.VisualProperties);
            return true;
        }
        return false;
    };

    /** @override */
    GXPathBase.prototype.restore = function (blob) {
        if (GXShape.prototype.restore.call(this, blob)) {
            this.restoreProperties(blob, GXPathBase.VisualProperties, true);
            return true;
        }
        return false;
    };

    /** @override */
    GXPathBase.prototype._handleChange = function (change, args) {
        this._handleVisualChangeForProperties(change, args, GXPathBase.VisualProperties);

        // Special handling when changing closed status of path
        if (change === GXNode._Change.AfterPropertiesChange) {
            if (args.properties.indexOf('closed') >= 0) {
                var points = this._getAnchorPoints();
                if (points) {
                    points._invalidateRight(points.getFirstChild());
                    points._invalidateLeft(points.getLastChild());
                }
                this._verticesDirty = true;
            } else if (args.properties.indexOf('transform') >= 0) {
                this._verticesDirty = true;
            }
        }
        GXShape.prototype._handleChange.call(this, change, args);
    };

    /**
     * @returns {GXPathBase.AnchorPoints}
     * @private
     */
    GXPathBase.prototype._getAnchorPoints = function () {
        return this._firstChild/*style*/._next/*anchor-points*/;
    };

    /** @override */
    GXPathBase.prototype.toString = function () {
        return "[GXPathBase]";
    };

    _.GXPathBase = GXPathBase;
})(this);
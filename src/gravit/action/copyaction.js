(function (_) {

    /**
     * Action for copying the current selection to the clipboard
     * @class GCopyAction
     * @extends GUIAction
     * @constructor
     */
    function GCopyAction() {
    };
    GObject.inherit(GCopyAction, GUIAction);

    GCopyAction.ID = 'edit.copy';
    GCopyAction.TITLE = new GLocale.Key(GCopyAction, "title");

    /**
     * @override
     */
    GCopyAction.prototype.getId = function () {
        return GCopyAction.ID;
    };

    /**
     * @override
     */
    GCopyAction.prototype.getTitle = function () {
        return GCopyAction.TITLE;
    };

    /**
     * @override
     */
    GCopyAction.prototype.getCategory = function () {
        return EXApplication.CATEGORY_EDIT;
    };

    /**
     * @override
     */
    GCopyAction.prototype.getGroup = function () {
        return "ccp";
    };

    /**
     * @override
     */
    GCopyAction.prototype.getShortcut = function () {
        return [GUIKey.Constant.META, 'C'];
    };

    /**
     * @override
     */
    GCopyAction.prototype.isEnabled = function () {
        var document = gApp.getActiveDocument();
        return document && !!document.getEditor().getSelection();
    };

    /**
     * @override
     */
    GCopyAction.prototype.execute = function () {
        // TODO : Support multiple clipboards internally
        // TODO : Support copy into system clipboard with
        // intern format, rasterized and as svg format

        // Make sure to serialize ordered
        var selection = GXNode.order(gApp.getActiveDocument().getEditor().getSelection());
        var serializedSelection = GXNode.serialize(selection);
        gShell.setClipboardContent(GXNode.MIME_TYPE, serializedSelection);
    };

    /** @override */
    GCopyAction.prototype.toString = function () {
        return "[Object GCopyAction]";
    };

    _.GCopyAction = GCopyAction;
})(this);

;(function(global) {
    var gbkDecoder = new TextDecoder('GBK');
    var gbkEncoder = new TextEncoder('GBK', { NONSTANDARD_allowLegacyEncoding: true });

    var KEY_UP = 1
    var KEY_DOWN = 2
    var KEY_LEFT = 3
    var KEY_RIGHT = 4
    var KEY_PAGEUP = 5
    var KEY_PAGEDOWN = 6
    var KEY_ENTER = 7
    var KEY_CANCEL = 8

    function transCode(k) {
        switch (event.keyCode) {
            case 13:
                return KEY_ENTER;
            case 32:
                return KEY_CANCEL;
            case 27:
                return KEY_CANCEL;
            case 38:
                return KEY_UP;
            case 40:
                return KEY_DOWN;
            case 37:
                return KEY_LEFT;
            case 39:
                return KEY_RIGHT;
            default:
                return 255;
        }
    };

    global.sysStorageGet = function(path) {
        return localStorage[path];
    };

    global.sysStorageSet = function(path, value) {
        localStorage[path] = value;
    };

    global.sysStorageHas = function(path) {
        return localStorage[path] != null;
    };

    global.sysGbkEncode = function(str) {
        return gbkEncoder.encode(str);
    };

    global.sysGbkDecode = function(data) {
        return gbkDecoder.decode(data);
    };

    global.sysRandom = Math.random;

    global.sysAddKeyDownListener = function(callback) {
        $('body').keydown(function(){
            callback(transCode(event.keyCode));
        });
    };

    global.sysAddKeyUpListener = function(callback) {
        $('body').keyup(function(){
            callback(transCode(event.keyCode));
        });
    };

    global.sysSetInterval = function(interval, callback) {
        return setInterval(callback, interval);
    };
})(this);


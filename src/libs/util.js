var Util = (function () {
    function Util() {
    }
    Util.getZone = function () {
        // Establish which zone we're running in
        var zone = process.env['ZONE'] || 'dev';
        var acceptedZones = ['dev', 'staging', 'prod', 'test'];
        if (acceptedZones.indexOf(zone) === -1) {
            zone = 'prod';
        }
        return zone;
    };
    return Util;
})();
exports["default"] = Util;

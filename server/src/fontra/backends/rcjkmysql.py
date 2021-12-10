import asyncio
from urllib.parse import urlparse, urlsplit, urlunsplit
from fontTools.ufoLib.glifLib import readGlyphFromString
from .pen import PathBuilderPointPen
from .rcjkclient import Client


class RCJKMySQLBackend:
    @classmethod
    def fromURL(cls, url):
        self = cls()
        parsed = urlsplit(url)
        if parsed.scheme != "https":
            raise ValueError(f"invalid url: {url}")
        port = f":{parsed.port}" if parsed.port is not None else ""
        plainURL = f"{parsed.scheme}://{parsed.hostname}{port}/"
        path_parts = parsed.path.split("/")
        if len(path_parts) != 3:
            raise ValueError(f"invalid path: {path}")
        _, project_name, font_name = path_parts

        self.client = Client(
            host=plainURL,
            username=parsed.username,
            password=parsed.password,
        )

        self.project_uid = _get_uid_by_name(
            self.client.project_list()["data"], project_name
        )
        self.font_uid = _get_uid_by_name(
            self.client.font_list(self.project_uid)["data"], font_name
        )
        self._glyphMapping = None
        return self

    async def getGlyphNames(self):
        return sorted(await self.getReversedCmap())

    async def getReversedCmap(self):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._getReversedCmapSync)

    async def getGlyph(self, glyphName):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._getGlyphSync, glyphName)

    def _getReversedCmapSync(self):
        self._glyphMapping = {}
        revCmap = {}
        for typeCode, methodName in _glyphListMethods.items():
            response = getattr(self.client, methodName)(self.font_uid)
            for glyphInfo in response["data"]:
                unicode_hex = glyphInfo.get("unicode_hex")
                if unicode_hex:
                    unicodes = [int(unicode_hex, 16)]
                else:
                    unicodes = []
                revCmap[glyphInfo["name"]] = unicodes
                self._glyphMapping[glyphInfo["name"]] = (typeCode, glyphInfo["id"])
        return revCmap

    def _getGlyphSync(self, glyphName):
        typeCode, glyphID = self._glyphMapping[glyphName]
        getMethodName = _getGlyphMethods[typeCode]
        response = getattr(self.client, getMethodName)(
            self.font_uid, glyphID, return_layers=True, return_related=True
        )
        axisDefaults = {}
        for baseGlyphDict in response["data"].get("made_of", ()):
            axisDefaults.update(extractAxisDefaults(baseGlyphDict))

        layers = {l["group_name"]: l for l in response["data"].get("layers", ())}
        glyph = serializeGlyph(response["data"]["data"], layers, axisDefaults)
        return glyph


def serializeGlyph(glifData, layers, axisDefaults):
    glyph = GLIFGlyph()
    pen = PathBuilderPointPen()
    readGlyphFromString(glifData, glyph, pen)

    defaultSourceDict = {
        "hAdvance": glyph.width,
    }
    path = pen.getPath()
    if path:
        defaultSourceDict["path"] = path

    defaultComponents = serializeComponents(glyph.lib.get("robocjk.deepComponents", ()), None, axisDefaults)
    components = defaultComponents or pen.components
    if components:
        defaultSourceDict["components"] = components
    componentNames = [c["name"] for c in components]

    sources = [
        {"location": {}, "source": defaultSourceDict},
    ]

    for varDict in glyph.lib.get("robocjk.variationGlyphs", ()):
        varSourceDict = {}
        layerName = varDict.get("layerName")
        hAdvance = 0
        if layerName:
            varGlyph = GLIFGlyph()
            pen = PathBuilderPointPen()
            readGlyphFromString(layers[layerName]["data"], varGlyph, pen)
            hAdvance = varGlyph.width
            path = pen.getPath()
            if path:
                varSourceDict["path"] = path
        varComponents = serializeComponents(
            varDict.get("deepComponents", ()), componentNames, axisDefaults
        )
        varComponents = varComponents or pen.components
        if varComponents:
            varSourceDict["components"] = varComponents
        hAdvance = varDict["width"] if "width" in varDict else hAdvance
        varSourceDict["hAdvance"] = hAdvance
        sources.append({"location": varDict["location"], "source": varSourceDict})

    glyphDict = {
        "name": glyph.name,
        "unicodes": glyph.unicodes,
        "axes": glyph.lib["robocjk.axes"],
        "sources": sources,
    }
    return glyphDict


def serializeComponents(deepComponents, componentNames, axisDefaults):
    if componentNames is not None:
        assert len(deepComponents) == len(componentNames)
    components = []
    for index, deepCompoDict in enumerate(deepComponents):
        component = {}
        name = deepCompoDict["name"] if "name" in deepCompoDict else componentNames[index]
        component["name"] = name
        if deepCompoDict["coord"]:
            component["coord"] = cleanupCoord(deepCompoDict["coord"], axisDefaults[name])
        component["transform"] = deepCompoDict["transform"]
        components.append(component)
    return components


def cleanupCoord(coord, axisDefaults):
    return {a: coord.get(a, v) for a, v in axisDefaults.items()}


class GLIFGlyph:
    unicodes = ()
    width = 0


_getGlyphMethods = {
    "AE": "atomic_element_get",
    "DC": "deep_component_get",
    "CG": "character_glyph_get",
}


_glyphListMethods = {
    "AE": "atomic_element_list",
    "DC": "deep_component_list",
    "CG": "character_glyph_list",
}


def _get_uid_by_name(items, name):
    for item in items:
        if item["name"] == name:
            return item["uid"]
    raise ValueError(f"item {name} not found")


def extractAxisDefaults(baseGlyphDict):
    axisDefaults = {}
    glyph = GLIFGlyph()
    readGlyphFromString(baseGlyphDict["data"], glyph)
    axisDefaults[glyph.name] = {a["name"]: a["defaultValue"] for a in glyph.lib.get("robocjk.axes", ())}
    return axisDefaults
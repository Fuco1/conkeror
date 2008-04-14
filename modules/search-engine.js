require("utils.js");

var search_engines = new string_hashmap();

function search_engine_parse_error(msg) {
    var e = new Error(msg);
    e.__proto__ = search_engine_parse_error.prototype;
    return e;
}
search_engine_parse_error.prototype.__proto__ = Error.prototype;

function search_engine() {
    this.urls = new string_hashmap();
}

function search_engine_url(type, method, template) {
    if (!method || !type || !template)
        throw search_engine_parse_error("Missing method, type, or template for search engine URL");
    method = method.toUpperCase();
    type = type.toUpperCase();
    if (method != "GET" && method != "POST")
        throw search_engine_parse_error("Invalid method");
    var template_uri = make_uri(template);
    switch (template_uri.scheme) {
    case "http":
    case "https":
        break;
    default:
        throw search_engine_parse_error("URL template has invalid scheme.");
        break;
    }
    this.type = type;
    this.method = method;
    this.template = template;
    this.params =  [];
}
search_engine_url.prototype.add_param = function search_engine_url__add_param(name, value) {
    this.params.push({name: name, value: value});
}

function load_search_engines_in_directory(dir) {
    var files = null;
    try {
        files = dir.directoryEntries.QueryInterface(Ci.nsIDirectoryEnumerator);

        while (files.hasMoreElements()) {
            var file = files.nextFile;

            if (!file.isFile())
                continue;

            try {
                load_search_engine_from_file(file);
            } catch (e) {
                dumpln("WARNING: Failed to load search engine from file: " + file.path);
                dump_error(e);
            }
        }
    } catch (e) {
        // FIXME: maybe have a better error message
        dump_error(e);
    } finally {
        if (files)
            files.close();
    }
}

function load_search_engine_from_file(file) {
    var file_istream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(Ci.nsIFileInputStream);
    file_istream.init(file, MODE_RDONLY, 0644, false);
    var dom_parser = Cc["@mozilla.org/xmlextras/domparser;1"].createInstance(Ci.nsIDOMParser);
    var doc = dom_parser.parseFromStream(file_istream, "UTF-8", file.fileSize, "text/xml");

    var eng = parse_search_engine_from_dom_node(doc.documentElement);
    search_engines.put(file.leafName, eng);
}

// Supported OpenSearch parameters
// http://www.opensearch.org/Specifications/OpenSearch/1.1#OpenSearch_URL_template_syntax
const OPENSEARCH_PARAM_USER_DEFINED    = /\{searchTerms\??\}/g;
const OPENSEARCH_PARAM_INPUT_ENCODING  = /\{inputEncoding\??\}/g;
const OPENSEARCH_PARAM_LANGUAGE        = /\{language\??\}/g;
const OPENSEARCH_PARAM_OUTPUT_ENCODING = /\{outputEncoding\??\}/g;

// Default values
const OPENSEARCH_PARAM_LANGUAGE_DEF         = "*";
const OPENSEARCH_PARAM_OUTPUT_ENCODING_DEF  = "UTF-8";
const OPENSEARCH_PARAM_INPUT_ENCODING_DEF   = "UTF-8";

// "Unsupported" OpenSearch parameters. For example, we don't support
// page-based results, so if the engine requires that we send the "page index"
// parameter, we'll always send "1".
const OPENSEARCH_PARAM_COUNT        = /\{count\??\}/g;
const OPENSEARCH_PARAM_START_INDEX  = /\{startIndex\??\}/g;
const OPENSEARCH_PARAM_START_PAGE   = /\{startPage\??\}/g;

// Default values
const OPENSEARCH_PARAM_COUNT_DEF        = "20"; // 20 results
const OPENSEARCH_PARAM_START_INDEX_DEF  = "1";  // start at 1st result
const OPENSEARCH_PARAM_START_PAGE_DEF   = "1";  // 1st page

// Optional parameter
const OPENSEARCH_PARAM_OPTIONAL     = /\{(?:\w+:)?\w+\?\}/g;

// A array of arrays containing parameters that we don't fully support, and
// their default values. We will only send values for these parameters if
// required, since our values are just really arbitrary "guesses" that should
// give us the output we want.
var OPENSEARCH_UNSUPPORTED_PARAMS = [
  [OPENSEARCH_PARAM_COUNT, OPENSEARCH_PARAM_COUNT_DEF],
  [OPENSEARCH_PARAM_START_INDEX, OPENSEARCH_PARAM_START_INDEX_DEF],
  [OPENSEARCH_PARAM_START_PAGE, OPENSEARCH_PARAM_START_PAGE_DEF],
];


function parse_search_engine_from_dom_node(node) {
    var eng = new search_engine();
    eng.query_charset = OPENSEARCH_PARAM_INPUT_ENCODING_DEF;

    for each (let child in node.childNodes) {
        switch (child.localName) {
        case "ShortName":
            eng.name = child.textContent;
            break;
        case "Description":
            eng.description = child.textContent;
            break;
        case "Url":
            try {
                let type = child.getAttribute("type");
                let method = child.getAttribute("method") || "GET";
                let template = child.getAttribute("template");

                let engine_url = new search_engine_url(type, method, template);
                for each (let p in child.childNodes) {
                    if (p.localName == "Param") {
                        let name = p.getAttribute("name");
                        let value = p.getAttribute("value");
                        if (name && value)
                            engine_url.add_param(name, value);
                    }
                }
                eng.urls.put(type, engine_url);
            } catch (e) {
                // Skip this element if parsing fails
            }
            break;
        case "InputEncoding":
            eng.query_charset = child.textContent.toUpperCase();
            break;
        }
    }
    return eng;
}

/**
 * Returns null if the result mime_type isn't supported.  The string
 * search_terms will be escaped by this function.
 */
search_engine.prototype.get_query_load_spec = function search_engine__get_query_load_spec(search_terms, type) {
    if (type == null)
        type = "text/html";
    var url = this.urls.get(type);
    if (!url)
        return null;
    search_terms = encodeURIComponent(search_terms);
    var eng = this;

    function substitute(value) {
        // Insert the OpenSearch parameters we're confident about
        value = value.replace(OPENSEARCH_PARAM_USER_DEFINED, search_terms);
        value = value.replace(OPENSEARCH_PARAM_INPUT_ENCODING, eng.query_charset);
        value = value.replace(OPENSEARCH_PARAM_LANGUAGE,
                              get_locale() || OPENSEARCH_PARAM_LANGUAGE_DEF);
        value = value.replace(OPENSEARCH_PARAM_OUTPUT_ENCODING,
                              OPENSEARCH_PARAM_OUTPUT_ENCODING_DEF);

        // Replace any optional parameters
        value = value.replace(OPENSEARCH_PARAM_OPTIONAL, "");

        // Insert any remaining required params with our default values
        for (let i = 0; i < OPENSEARCH_UNSUPPORTED_PARAMS.length; ++i) {
            value = value.replace(OPENSEARCH_UNSUPPORTED_PARAMS[i][0],
                                  OPENSEARCH_UNSUPPORTED_PARAMS[i][1]);
        }

        return value;
    }

    var url_string = substitute(url.template);

    var data = url.params.map(function (p) (p.name + "=" + substitute(p.value))).join("&");

    if (url.method == "GET") {
        if (data.length > 0) {
            if (url_string.indexOf("?") == -1)
                url_string += "?";
            else
                url_string += "&";
            url_string += data;
        }
        return load_spec({uri: uri_string});
    } else {
        var string_stream = Cc["@mozilla.org/io/string-input-stream;1"].createInstance(Ci.nsIStringInputStream);
        string_stream.data = data;
        return load_spec({uri: uri_string, raw_post_data: data,
                          request_mime_type: "application/x-www-form-urlencoded"});
    }
}

// Load search engines from default directories
{
    let dir = file_locator.get("CurProcD", Ci.nsIFile);
    dir.append("search-engines");
    if (dir.exists() && dir.isDirectory())
        load_search_engines_in_directory(dir);

    dir = file_locator.get("ProfD", Ci.nsIFile);
    dir.append("search-engines");
    if (dir.exists() && dir.isDirectory())
        load_search_engines_in_directory(dir);
}
// ========================================================================
// Copyright (c) 2008-2009, Metaweb Technologies, Inc.
// All rights reserved.
// 
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
// 
// THIS SOFTWARE IS PROVIDED BY METAWEB TECHNOLOGIES AND CONTRIBUTORS
// ``AS IS'' AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL METAWEB
// TECHNOLOGIES OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
// INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
// BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS
// OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR
// TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
// USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
// DAMAGE.
// ========================================================================


/*
**  Rendering the spreadsheet back to the user
*/

function onDisplayOutputScreen() {
    renderSpreadsheet();
    prepareTriples();
}

var triplewriter_service = "http://spreadsheet.rictic.user.dev.freebaseapps.com/"

function encodeLine(arr) {
    var values = [];
    for(var i = 0; i < headers.length; i++){
        var val = arr[i];
        if (typeof val == "undefined")
            values.push("");
        else if (!val.match(/(\t|\"|\n)/))
            values.push(arr[i])
        else {
            val = val.replace(/"/g, '""');
            values.push('"' + val + '"');
        }
    }
    return values.join("\t");
}

//Like getChainedProperty, only it preserves array placement
function getChainedPropertyPreservingPlace(entity, prop) {
    var slots = [entity];
    $.each(prop.split(":"), function(_,part) {
        var newSlots = [];
        $.each(slots, function(_,slot) {
            if (!slot || !slot[part])
                newSlots.push(undefined);
            else
                newSlots = newSlots.concat($.makeArray(slot && slot[part]))
        })
        slots = newSlots;
    });
    if (slots === []) return undefined;
    return slots;
}


function encodeRow(row) {
    var lines = [[]];
    for (var i = 0; i < headers.length; i++){
        var val = getChainedPropertyPreservingPlace(row, headers[i]);
        if ($.isArray(val)) {
            for (var j = 0; j < val.length; j++) {
                if (lines[j] == undefined) lines[j] = [];
                lines[j][i] = textValue(val[j]);
            }
        }
        else
            lines[0][i] = textValue(val);
    }
    return $.map(lines,encodeLine);
}

var nonce = 0;
function renderSpreadsheet() {
    nonce++;
    var nonceValue = nonce;
    var lines = [];
    lines.push(encodeLine(headers));
    $("#outputSpreadSheet")[0].value = "One moment, rendering...";
    
    politeEach(rows, function(idx, row) {
        lines = lines.concat(encodeRow(row));
    },
    function() {
        if (nonceValue === nonce)
            $("#outputSpreadSheet")[0].value = lines.join("\n");
    })
}

function prepareTriples() {
    getTriples(rows, function(triples) {
        $(".triple_count").html(triples.length)
        $('#payload')[0].value = triples.join("\n")
    });
}

function getTriples(rows, callback) {
    var triples = [];
    function isValidID(id) {
        if ($.isArray(id))
            id = id[0];
        return id !== undefined && $.trim(id) !== "";
    }
    function getID(entity) {
        if (entity.id === "None")
            return "$entity" + entity['/rec_ui/id'];
        return entity.id;
    }
    function encodeValue(value) {
        return '"' + value.replace("\\","\\\\").replace("\n","\\n").replace("\t","\\t").replace('"','\\"') + '"';
    }
    politeEach(entities, function(_,subject) {
        if (!isValidID(subject.id))
            return;
        $.each($.makeArray(subject['/type/object/type']), function(_, type){
            triples.push(getID(subject) + " /type/object/type " + type);
        });
        if (subject.id === "None"){
            $.each($.makeArray(subject["/type/object/name"]), function(_, name) {
                if (name)
                    triples.push(getID(subject) + " /type/object/name " + encodeValue(name));
            });
        }

        $.each(subject['/rec_ui/mql_props'], function(_, predicate) {
            $.each($.makeArray(subject[predicate]), function(_, object) {
                if  (!isValidID(object.id)) {
//                    log("object blank" + predicate + " " + subject['/rec_ui/id']);
                   return;
                }
                if (isValueProperty(predicate))
                    triples.push(getID(subect) + " " + predicate + " " + envodeValue(object));
                else
                    triples.push(getID(subject) + " " + predicate + " " + getID(object));
            })
        });
    }, function() {callback(triples)});
}

function checkLogin() {
    $(".uploadLogin").hide();
    $(".uploadForm").hide();
    $.getJSON(triplewriter_service + "check_login?jsonp=?",{},function(data) {
        info(data);
        if (!data.status || !data.status.code)
            error(data);
        else if (data.status.code === 200){
            $(".uploadLogin").hide();
            $(".uploadForm").show();
        }
        else if (data.status.code === 401){
            $(".uploadLogin").show();
            $(".uploadForm").hide();
        }
        else
            error(data);
    })
}
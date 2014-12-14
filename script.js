var thumbsize = 200;
var button_text = "";
var letters = {
    "first.html": "Jans",
    "basic.html": "test"
};
var messages = {
    "no_license": "Filsidan verkar sakna maskinläsbar licens.<br /> Vänligen fixa filsidan och försök igen.",
    "no_information": "Filsidan verkar sakna maskinläsbar metadata om skapare eller ett annat nödvänfigt fält.<br /> Lägg till en Information-mall på sidan och försök igen.",
    "upload_date_cmt": "Notera att det automatiska datumet är det för den senaste uppladdningen.",
    "unsupported_license": "Denna filen har tyvärr en licens som för närvarande inte stöds av verktyget.",
    "public_domain": "Denna filen verkar vara public domain (dvs. inte upphovsrättsligt skyddad).<br /> Ingen anmälan är därmed möjlig.",
    "CC0": "Denna filen verkar ha licensierats under CC0 vilket innebär att den är i public domain (dvs. inte upphovsrättsligt skyddad).<br /> Ingen anmälan är därmed möjlig.",
    "missing_file": "Kunde inte hitta filen, är du säker på att du angav rätt filnamn?",
    "random_url": "Vänligen ange namnet på en fil på Wikimedia Commons (detta verkar vara en url någon annanstans).",
    "missing_parameter": "Följande krävda fält saknas: ",
    "subject": "Felaktig användning av mitt verk",
    "not_an_email": "Det angivna värdet ser inte ut som en e-postadress."
};
$(document).ready(function() {
    // load filename from url
    var urlFilename = getURLParameter('filename');
    if (urlFilename) {
        $('#filename').val(urlFilename);
    }
    // responsive buttons
    $('.button').hover(
        function() {
            if (!$(this).prop("disabled")) {
                $(this).addClass('active');
            }
        },
        function() {
            $(this).removeClass('active');
        }
    );
    // collapse examples
    $('.collapse').click(function(){
        $('.examples').slideToggle('slow');
    });
    // add preview of any value in an input with the to_preview class
    $('.to_preview').keyup(function() {
        var content = $(this).val();
        var previewId = "#" + $(this).attr('id') + "_preview";
        $(previewId).html(content);
    });
    // add asterisk next to any required input field
    $('input').each(function() {
        if ($(this).prop('required') && $(this).attr('type') != 'hidden') {
            $(this).after("<span class=\"problem\">*</span>");
        }
    });
    // handle invalid or missing publisher e-mail
    $('#publisher').focusout(function() {
        var content = $(this).val();
        var previewId = "#" + $(this).attr('id') + "_preview";
        $(previewId).removeClass('problem');
        if (content !== ''){
            ok = false;
            if (content.indexOf('@') > 0) {
                if (content.indexOf('.', content.indexOf('@')) > 0) {
                    ok = true;
                }
            }
            if (ok) {
                $(previewId).html(content);
                $('#button_mailto').prop("disabled", false);
            }
            else {
                $(previewId).addClass('problem');
                $(previewId).html(messages.not_an_email);
                $('#button_mailto').prop("disabled", true);
            }
        }
        else {
            $('#button_mailto').attr("disabled", true);
        }
    });
    // on enter or clicking button, look up info on Commons
    $('#filename').keypress(function(e) {
        if(e.which == 13) {
            processFilename();
        }
    });
    $('#button').click(function() {
        processFilename();
    });
    // compose letter
    $('#button_write').click(function() {
        // check requirements
        $('#reflect').empty();
        var run = true;
        $('#post_lookup').find('input').each(function() {
            if($(this).prop('required') && !$(this).val()){
                $(this).addClass('warning');
                $('#reflect').html(messages.missing_parameter + $(this).attr('id'));
                run = false;
            }
            else {
                $(this).removeClass('warning');
            }
        });

        if (!run) {
            return false;
        }

        // read values
        var credit = $('#credit').val();
        var descr = $('#descr').val();
        var upload_date = $('#upload_date').val();
        var publisher = $('#publisher').val();
        // $('#publisher').val();

        // parse
        if (descr !== ''){
            descr = "på " + descr;
        }
        if (upload_date !== ''){
            upload_date = "sedan " + upload_date;
        }

        // output
        //$('#letter_templated').loadTemplate("#template_basic", // load local
        $('#letter_templated').loadTemplate("./templates/" + $('#letter_selector').val(),
            {
                descr: descr,
                usage: $('#usage').val(),
                upload_date: upload_date,
                license_title: $('#license_title').val(),
                license_url: $('#license_url').val(),
                file_title: $('#file_title').val(),
                file_url: $('#file_url').val(),
                credit: credit,
                credit_plain: unwrapAll(credit)
            });
        // make letter visible
        $('#letter').removeClass('hidden');
    });

    // ctrl+c, mac+c putts letter in clipboard
    $(document).keydown(function(e) {
        // check that ctrl (or mac equiv) is pressed and that
        // there is some content to be copied
        if ($('#letter_templated').text() === '' || !(e.ctrlKey || e.metaKey)) {
            return;
        }
        selectMe($('#letter_templated'));
    });
    // empty clipboard once ctrl is released
    $(document).keyup(function(e) {
        if ($(e.target).is("#clipboard")) {
            $("#clipboard").empty();
        }
    });

    // send mail on mailto
    $('#button_mailto').click(function() {
        var subject = messages.subject;
        window.open("mailto:" +
                    $('#publisher').val() +
                    "?subject=" +
                    subject +
                    "&body=" +
                    encodeURIComponent($('#letter_templated').text()) , '_blank');
    });
});

// Validate filename and request info from Commons
function processFilename() {
    // reset later fields
    $('#reflect').empty();
    $('#letter').addClass('hidden');
    $('#thumbDiv').addClass('hidden');
    $('#post_lookup').addClass('hidden');

    // test filename
    var run = true;
    var input = $('#filename').val();
    if (input === ''){
        $('#filename').addClass('highlighted');
        run = false;
    }
    else if ( input.match(/([^.]*).wiki(p|m)edia.org\/wiki\/([^:])/gi) ) {
        input = decodeURIComponent(
                    input.split('/wiki/')[1].split(':')[1])
                .replace('_', ' ');
        $('#filename').val(input);
    }
    else if (input.indexOf('://') >= 0) {
        $('#filename').addClass('highlighted');
        $('#reflect').html(messages.random_url);
        run = false;
    }
    else if (input.indexOf(':') >= 0) {
        $('#filename').val(input.split(':')[1]);
    }

    // run if filename is likely to be valid
    if (run) {
        input = $('#filename').val();
        $('#filename').removeClass('highlighted');
        button_text = $('#button').html(); //because I don't want to hardcode value
        $('#button').html("loading...");
        $.getJSON("https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&format=json&iilimit=1" +
                  "&iiprop=url|timestamp|extmetadata" +
                  "&iiurlwidth=" + thumbsize +
                  "&iiextmetadatafilter=Credit|ImageDescription|Artist|LicenseShortName|UsageTerms|LicenseUrl|Copyrighted" +
                  "&titles=File%3A" + input +
                  "&callback=?",
            parseMetadata);
    }
}

// parse the metadata response from Commons
function parseMetadata(response) {
    $('#button').html(button_text);
    $.each(response.query.pages, function(key, value) {
        if ("missing" in value) {
            $('#filename').addClass('highlighted');
            $('#reflect').html(messages.missing_file);
        }
        else {
            console.log(JSON.stringify(value));
            // display image independent on later errors
            $('#thumb').attr("src", value.imageinfo[0].thumburl);
            $('#thumb').attr("width", thumbsize);
            $('#thumbDiv a').attr("href", value.imageinfo[0].descriptionurl);
            $('#thumbDiv').removeClass('hidden');

            var extmetadata = value.imageinfo[0].extmetadata;
            if ("Copyrighted" in extmetadata && extmetadata.Copyrighted.value == "False") {
                $("#reflect").append(messages.public_domain);
            }
            else if ("LicenseUrl" in extmetadata && "LicenseShortName" in extmetadata) {
                // formatting
                render = false;
                var lic = value.imageinfo[0].extmetadata.LicenseShortName.value;
                if(lic.indexOf('CC-BY-SA-') === 0 || lic.indexOf('CC BY-SA ') === 0) {
                    // test for both since this recently got corrected but a lot of values are cached
                    lic = "CC BY-SA " + lic.slice(9);
                    render = true;
                }
                else if (lic.indexOf('CC-BY-') === 0 || lic.indexOf('CC BY ') === 0) {
                    lic = "CC BY " + lic.slice(6);
                    render = true;
                }
                else if (lic.indexOf('CC0') === 0) {
                    $("#reflect").append(messages.CC0);
                }
                else {
                    $("#reflect").append(messages.unsupported_license);
                }
                
                // if any of these are missing rendering fails, most likely due to no supported template
                if (! (extmetadata.Artist && extmetadata.Credit && extmetadata.ImageDescription) ) {
                    $("#reflect").append(messages.no_information);
                    render = false;
                }
                
                // output
                if (render) {
                    addInput({
                        usage: "",
                        credit: extmetadata.Artist.value,
                        credit_extra: extmetadata.Credit.value+"<br />",
                        descr: "",
                        descr_extra: unwrapAll(extmetadata.ImageDescription.value)+"<br />",
                        upload_date: value.imageinfo[0].timestamp.slice(0,10),
                        upload_date_cmt: messages.upload_date_cmt + "<br />",
                        license_title: lic,
                        license_url: value.imageinfo[0].extmetadata.LicenseUrl.value,
                        file_title: value.title.slice(5),
                        file_url: value.imageinfo[0].descriptionurl,
                        publisher: ""
                        });
                    // make post_lookup_templated visible
                    $('#post_lookup').removeClass('hidden');
                }
            }
            else {
                $("#reflect").append(messages.no_license);
            }
        }
    });
}

// cannot load this as a template but externalising to make neater
function addInput(data) {
    $('#pagename a').attr("href", data.file_url);
    $('#pagename a').html(data.file_title);
    $("#usage").val(data.usage);
    $("#file_title").val(data.file_title);
    $("#file_url").val(data.file_url);
    $('#license a').attr("href", data.license_url);
    $('#license a').html(data.license_title);
    $("#license_title").val(data.license_title);
    $("#license_url").val(data.license_url);
    $("#upload_date").val(data.upload_date);
    $("#upload_date_cmt").html(data.upload_date_cmt);
    $('#credit').val(data.credit);
    $('#credit_preview').html(data.credit);
    $('#credit_extra').html(data.credit_extra);
    $('#descr').val(data.descr);
    $('#descr_preview').html(data.descr);
    $('#descr_extra').html(data.descr_extra);
    $('#publisher').val(data.publisher);
    // populate selector
    $('#letter_selector').empty();
    $.each(letters, function(key, value) {
        $('#letter_selector')
            .append($('<option>', { value : key })
            .text(value));
    });
}

// unwraps all html tags in the sent data
function unwrapAll(data) {
    var $tmp = $('<div />', {
            html: data
        });
    $tmp.find('*').contents().unwrap();
    return $tmp.html();
}

// returns the named url parameter
function getURLParameter(param) {
    var pageURL = decodeURIComponent(window.location.search.substring(1));
    var urlVariables = pageURL.split('&');
    for (var i = 0; i < urlVariables.length; i++) {
        var parameterName = urlVariables[i].split('=');
        if (parameterName[0] == param) {
            return parameterName[1];
        }
    }
}

// copies the given div into the hidden clipboard and selects it
// Heavily influenced by Daniels answer to stackoverflow.com/questions/17527870
function selectMe($origin) {
    $('#clipboard').html($origin.html());

    // check that nothing else was selected then select
    // needs to deal with IE and Moz differently
    if (window.getSelection()) {
        if (window.getSelection().toString()){
            return;
        }
        var selection = window.getSelection();
        var rangeMoz = document.createRange();
        rangeMoz.selectNodeContents($('#clipboard')[0]);
        selection.removeAllRanges();
        selection.addRange(rangeMoz);
    }
    else if (document.selection) {
        if (document.selection.createRange().text) {
            return;
        }
        var rangeIE = document.body.createTextRange();
        rangeIE.moveToElementText($('#clipboard')[0]);
        rangeIE.select();
    }
}

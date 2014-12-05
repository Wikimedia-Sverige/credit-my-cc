var thumbsize = 200;
var button_text = "";
var letters = {
    "first.html": "Jans",
    "basic.html": "test"
};
$(document).ready(function() {
    // load filename from url
    var urlFilename = GetURLParameter('filename');
    if (urlFilename) {
        $('#filename').val(urlFilename);
    }
    // responsive buttons
    $('.button').hover(
        function() {
            $(this).toggleClass('active');
        },
        function() {
            $(this).toggleClass('active');
        }
    );
    //collapse examples
    $('.collapse').click(function(){
        $('.examples').slideToggle('slow');
    });
    // add preview of any value in an input with the to_preview class
    $('.to_preview').keyup(function() {
        var content = $(this).val();
        var previewId = "#" + $(this).attr('id') + "_preview";
        $(previewId).html(content);
    });
    // look up info on commons
    $('#button').click(function() {
        $('#reflect').empty();
        $('#brev').addClass('hidden');
        $('#post_lookup').addClass('hidden');
        var run = true;
        var input = $('#filename').val();
        if (input === ''){
            $('input').addClass('highlighted');
            run = false;
        }
        else if ( input.match(/([^.]*).wiki(p|m)edia.org\/wiki\/([^:])/gi) ) {
            input = decodeURIComponent(
                        input.split('/wiki/')[1].split(':')[1])
                    .replace('_', ' ');
            $('#filename').val(input);
        }
        else if (input.indexOf('://') >= 0) {
            $('input').addClass('highlighted');
            $('#reflect').html("Vänligen ange namnet på en fil på Wikimedia Commons (detta verkar vara en url någon annanstans).");
            run = false;
        }
        else if (input.indexOf(':') >= 0) {
            $('#filename').val(input.split(':')[1]);
        }
        if (run) {
            input = $('#filename').val();
            $('input').removeClass('highlighted');
            button_text = $('#button').html(); //because I don't want to hardcode value
            $('#button').html("loading...");
            $.getJSON("https://commons.wikimedia.org/w/api.php?action=query&prop=imageinfo&format=json&iiprop=url|timestamp|extmetadata&iilimit=1&iiurlwidth=" +
                      thumbsize +
                      "&iiextmetadatafilter=Credit|ImageDescription|Artist|LicenseShortName|UsageTerms|LicenseUrl|Copyrighted&titles=File%3A" +
                      input +
                      "&callback=?",
                parseMetadata);
        }
    });
    // compose letter
    $('#button_write').click(function() {
        // check requirements
        $('#reflect').empty();
        var run = true;
        $('#post_lookup').find('input').each(function() {
            if($(this).prop('required') && !$(this).val()){
                $(this).addClass('warning');
                $('#reflect').html("The required field \"" + $(this).attr('id') + "\" is missing");
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
        // $('#publisher').val();
        
        // parse
        if (descr !== ''){
            descr = "på " + descr;
        }
        if (upload_date !== ''){
            upload_date = "sedan " + upload_date;
        }
        
        // output
        $('#brev_templated').loadTemplate("#template_basic", // load local
        //$('#brev_templated').loadTemplate("./templates/" + $('#letter_selector').val(),
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
        // make brev visible
        $('#brev').removeClass('hidden');
    });
    
    $('#button_mailto').click(function() {
        var subject = "Felaktig användning av mitt verk";
        console.log($('#brev_templated').text());
        window.open("mailto:address@dmail.com?subject=" +
                    subject +
                    "&body=" +
                    encodeURIComponent($('#brev_templated').text()) , '_blank');
    });
});

function parseMetadata(response) {
    $('#button').html(button_text);
    $.each(response.query.pages, function(key, value) {
        if ("missing" in value) {
            $('input').addClass('highlighted');
            $('#reflect').html("Couldn't find the file, Are you sure you got it right?");
        }
        else {
            var extmetadata = value.imageinfo[0].extmetadata;
            if ("Copyrighted" in extmetadata && extmetadata.Copyrighted.value == "False") {
                $("#reflect").append("<span>License: The file does not appear to be copyrighted</span>");
            }
            else if ("LicenseUrl" in extmetadata && "LicenseShortName" in extmetadata) {
                // formatting
                var lic = value.imageinfo[0].extmetadata.LicenseShortName.value;
                if(lic.indexOf('CC-BY-SA-') === 0) {
                    lic = "CC BY-SA " + lic.slice(9);
                }
                else if (lic.indexOf('CC-BY-') === 0) {
                    lic = "CC BY " + lic.slice(6);
                }
                else {
                    $("#reflect").append("This is not one of the supported licenses, the requirements specified in the letter may therefore be incorrect");
                }
                
                // output
                addInput({
                    title: "<a href=\"" + value.imageinfo[0].descriptionurl + "\">" + value.title +"</a><br />",
                    usage: "",
                    credit: extmetadata.Artist.value,
                    credit_extra: extmetadata.Credit.value+"<br />",
                    descr: "",
                    descr_extra: unwrapAll(extmetadata.ImageDescription.value)+"<br />",
                    upload_date: value.imageinfo[0].timestamp.slice(0,10),
                    upload_date_cmt: "Notera att det automatiska datumet är det för den senaste uppladdningen<br />",
                    license_title: lic,
                    license_url: value.imageinfo[0].extmetadata.LicenseUrl.value,
                    file_title: value.title.slice(5),
                    file_url: value.imageinfo[0].descriptionurl,
                    thumburl: value.imageinfo[0].thumburl,
                    thumbsize: thumbsize,
                    publisher: ""
                    });
                // make post_lookup_templated visible
                $('#post_lookup').removeClass('hidden');
            }
            else {
                $("#reflect").append("<span>License: Could not extract license from file</span>");
            }
        }
    });
}

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
    $('#thumb').attr("src", data.thumburl);
    $('#thumb').attr("width", data.thumbsize);
    $('#publisher').val(data.publisher);
    // populate selector
    $('#letter_selector').empty();
    $.each(letters, function(key, value) {
        $('#letter_selector')
            .append($('<option>', { value : key })
            .text(value)); 
    });
}

function unwrapAll(data) {
    var $tmp = $('<div />', {
            html: data
        });
    $tmp.find('*').contents().unwrap();
    return $tmp.html();
}

function GetURLParameter(param) {
    var pageURL = decodeURIComponent(window.location.search.substring(1));
    var urlVariables = pageURL.split('&');
    for (var i = 0; i < urlVariables.length; i++) {
        var parameterName = urlVariables[i].split('=');
        if (parameterName[0] == param) {
            return parameterName[1];
        }
    }
}

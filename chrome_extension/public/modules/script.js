var get_type = function(callback) {
    var type = '';
    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, function (tabs) {
        var url = tabs[0].url;
        if (url.indexOf('.facebook.com') > -1) {
            type = 'fb';
        } else if (url.indexOf('gall.dcinside.com/board/view/?id=') > -1) {
            type = 'dc';
        }
    
        console.log("DEBUG get_type: ", url, type);    
        callback(type);
    });
};
var get_text_fb = function(callback) {
    chrome.tabs.executeScript({
        code: 'var result="";document.querySelectorAll(".UFIComment").forEach(function(el){result += el.outerHTML;});result;'
    }, function(result) {
        if (result && result.length) {
            $('#copy_reply').html(result[0]);

            if ($('#copy_reply .UFICommentContent .UFICommentBody.filtered_text').length) {
                callback(null, 'already_check');
            } else {
                callback('.UFICommentContent .UFICommentBody', document.querySelectorAll('#copy_reply .UFICommentBody'));
            }
        } else {
            callback(null);
        }
    });
};

var get_text_dc = function(callback) {
    chrome.tabs.executeScript({
        code: 'document.querySelector("#gallery_re_contents").innerHTML'
    }, function(result) {
        if (result && result.length) {
            $('#copy_reply').html(result[0]);
            $('#copy_reply td.reply span').remove();
            
            if ($('#copy_reply td.reply.filtered_text').length) {
                callback(null, 'already_check');
            } else {
                callback('#gallery_re_contents tbody > tr:nth-child([IDX]) td.reply', document.querySelectorAll('#copy_reply td.reply'), [4, 1]);
            }
        } else {
            callback(null);
        }
    });
};

var make_filtering_list = function() {
    var filtering_list = '';

    if ($('[name="emotion_filter_show"]:checked').val() == 'y') {
        var len = $('#filter_list_div input').length;
        $('#filter_list_div input').map(function (idx, obj) {
            console.log(obj, obj.checked);
            if (obj.checked) {
                filtering_list += $(obj).parent().text().trim() + '|';
            }
        });
        filtering_list = new RegExp(filtering_list ? filtering_list.substring(0, filtering_list.length-1) : '');
    } else {
        filtering_list = default_filtering_list;
    }

    return filtering_list;
}

$(document).on('click', '[name="emotion_filter_show"]', function() {
    if ($(this).val() == 'y') {
        $('#filter_list_div').show();
    } else {
        $('#filter_list_div').hide();
    }
});

var type;
var default_filtering_list;

var print_emotion = function(check, callback) {
    if (!callback || typeof callback !== 'function') {
        callback = function() {};
    }
    var get_text = type == 'fb' ? get_text_fb : (type == 'dc' ? get_text_dc : '');
    if (!type) {
        callback('cannot_filter');
    } else {
        get_text(function(className, result, idx_info) {
            progress_work(0, true);
            var total_num = 0;
            var filtered_num = 0;
            var filtering_list = make_filtering_list();
            if (className && result && check) {
                $('#emotion_check').attr('disabled', true);
                total_num = result.length;
                var count = 0;
                result.forEach(function(item, idx) {
                    $.post('http://localhost:3000/external_api', {
                        url: 'http://home.iacryl.com:7070/', 
                        options: {
                            nlptype: 'aer',
                            text: encodeURIComponent(item.innerText)
                        }
                    }, function(res) {
                        if (res.sentences) {
                            var sentences = res.sentences;
                            var all_sentence = '';
                            var main_emotion = '';
                            sentences.map(function(data, i) {
                                var emotions = data.emotions || null;
                                main_emotion += emotions && emotions[0] ? (emotions[0].emotion || '알 수 없음') : '알 수 없음';
                                all_sentence += data.sentence || '';
                                main_emotion += ', ';
                            });
                            main_emotion = main_emotion ? main_emotion.substring(0, main_emotion.length-2) : '';

                            //$('#result').html($('#result').html() + '<br>The emotion of "' + all_sentence + '" is "' + main_emotion + '".');
                        
                            var inner_className;
                            if (type == 'fb') {
                                inner_className = '#' + item.closest('.UFIComment').id + ' ' + className;
                            } else {
                                inner_className = className.replace(/\[IDX\]/g, idx_info && idx_info.length ? idx_info[0]*idx + idx_info[1] : idx);
                            }
                            var script_code = [
                                //'var e = document.createElement("p");',
                                //'e.innerHTML="The main emotion of this article is ' + main_emotion + '";',
                                //'e.setAttribute("style", "color: initial;");',
                                'var article = document.querySelector("' + inner_className + '");', // add parentElement in fb
                                //'article.insertBefore(e, article.childNodes[0]);'
                            ].join('');

                            console.log(filtering_list, main_emotion);
                            if (filtering_list && main_emotion.match(filtering_list)) {
                                script_code += 'article.setAttribute("style", "color: #eee;");';
                                script_code += 'article.className += " filtered_text";';
                                filtered_num++;
                            }
                            
                            chrome.tabs.executeScript(null, {
                                code: script_code
                            }, function() {
                                count++;
                                var percent = parseInt(filtered_num / total_num / 1000 * 100000, 10);
                                progress_work(percent, true);

                                if (count == total_num) {
                                    $('#emotion_check').attr('disabled', false);
                                    callback();
                                }
                            });
                        } else {
                            count++;
                            if (count == total_num) {
                                $('#emotion_check').attr('disabled', false);
                                callback();
                            }
                            //$('#result').html($('#result').html() + '<br>Cannot find any text or emotion.');
                        }
                    });
                });
            } else if (result == 'already_check') {
                /*
                var feeling_info = '';
                $('#copy_reply td.reply p').map(function(idx, obj) {
                    feeling_info += '<br>' + $(obj).text();
                });
                $('#result').html(feeling_info);
                */
                var className = type == 'fb' ? '.UFICommentBody' : 'td.reply';
                var percent = parseInt($('#copy_reply .filtered_text').length / $('#copy_reply ' + className).length / 1000 * 100000, 10);
                progress_work(percent, true);
                callback();
            } else if (check) {
                console.log("No Text Found");
                callback('no_text');
            } else {
                callback();
            }
        });
    }
};

$(document).ready(function() {
    get_type(function(result) {
        type = result;
        if (type == 'fb' || type == 'dc') {
            get_blacklist(type, true);
            
            var filtering_list = '';
            $('#filter_list_div input').map(function (idx, obj) {
                if (obj.checked) {
                    filtering_list += $(obj).parent().text().trim() + '|';
                }
            });
            default_filtering_list = new RegExp(filtering_list ? filtering_list.substring(0, filtering_list.length-1) : '');
            
            $('#emotion_check').attr('disabled', false);
        } else {
            console.log('Cannot filter emotion in this page.');
            $('#emotion_check').attr('disabled', true);
        }
    });
});

$(document).on('click', '#emotion_check', function() {
    print_emotion(true, function(emotion_err) {
        if (!emotion_err) {
            var list = [];
            var add_list = [];
            var get_whole_code;
            var get_id_selector;
            if (type == 'fb') {
                get_whole_code = 'var result="";document.querySelectorAll(".UFICommentActorAndBody").forEach(function(el){result += el.outerHTML;});result;';
                get_id_selector = '.UFICommentActorName';
            } else if (type == 'dc') {
                get_whole_code = 'document.querySelector("#gallery_re_contents").innerHTML';
                get_id_selector = 'span.etc_ip';
            }

            chrome.tabs.executeScript(null, {
                code: get_whole_code
            }, function(result) {
                $('#copy_after').html(result[0]);
                $('#copy_after .filtered_text').map(function(idx, obj) {
                    if ($(obj).find(get_id_selector).length) {
                        var id, article;
                        if (type == 'dc') {
                            id = $(obj).find(get_id_selector).text();
                            var text = $(obj).text();
                            article = text.substring(0, text.indexOf(id)).trim();
                        } else if (type == 'fb') {
                            var $id_obj = $(obj).closest(get_id_selector);
                            id = '<a href="' + $id_obj.attr('href') + '">' + $id_obj.text() + '</a>';
                            article = $(obj).text();
                        }

                        if (list[id]) {
                            list[id].filtered_num++;
                            list[id].article.push(article);
                        } else {
                            list[id] = {
                                filtered_num: 1,
                                article: [article]
                            };
                        }
                    }
                });

                Object.keys(list).map(function(id) {
                    add_list.push({
                        id: id,
                        filtered_num: list[id].filtered_num,
                        article: list[id].article
                    });
                });
                
                $.post('http://localhost:3000/add_blacklist', {
                    list: add_list,
                    type: type
                }, function(res) {
                    if (res.err) {
                        console.log(res.err);
                    } else {
                        get_blacklist(type, false);
                    }
                });
            });
        }
    });
});

$(document).on('click', '#filter_switch', function() {
    $(this).find('.btn').toggleClass('active');  
    $(this).find('.btn').toggleClass('btn-primary');
    $(this).find('.btn').toggleClass('btn-default');
    
    var clicked = $(this).find('.btn-primary').val() === 'true';
    $('#emotion_check').attr('disabled', !clicked);
    
    var sub_code = 'item.';
    if (!clicked) {
        sub_code += 'removeAttribute("style");';
        progress_work(0, false);
    } else {
        sub_code += 'setAttribute("style", "color: #eee;");';
        progress_work($('#result .progress-bar').data('value'), false);
    }
    
    var fb_class = '.UFIList .UFIComment .UFICommentBody';
    var dc_class = '#gallery_re_contents tbody td.reply';
    var className = type == 'fb' ? fb_class : dc_class;
    chrome.tabs.executeScript(null, { // CHANGE
        code: 'document.querySelectorAll("' + className + '.filtered_text").forEach(function(item) {' +
                  sub_code +
              '});'
    });
});

var get_blacklist = function(type, for_init) {
    $('#blacklist .blist_table tbody').empty();
    var middle = for_init ? print_emotion : function(nothing, callback) {callback();};
    var id_list = [];
    var get_whole_code;
    if (type == 'fb') {
        get_whole_code = 'var result="";document.querySelectorAll(".UFICommentActorAndBody").forEach(function(el){result += el.outerHTML;});result;';
    } else if (type == 'dc') {
        get_whole_code = 'document.querySelector("#gallery_re_contents").innerHTML';
    }


    chrome.tabs.executeScript(null, {
        code: get_whole_code
    }, function(results) {
        $('#copy_reply').html(results[0]);
        if (type == 'fb') {
            $('#copy_reply .UFICommentActorName').map(function(idx, obj) {
                id_list.push('<a href="' + $(obj).attr('href') + '">' + $(obj).text() + '</a>');
            });
        } else {
            $('#copy_reply tbody td.reply span.etc_ip').map(function(idx, obj) {
                id_list.push($(obj).text());
            });
        }
        
        $.post('http://localhost:3000/get_blacklist', {
            type: type,
            id_list: id_list
        }, function(res) {
            var list = res.result || [];
            middle(false, function(_err) {
                if (!res.err && !_err) {
                    var template = function(id, num) {
                        return [
                            '<tr class="blist_row">',
                                '<td class="col-xs-9"> ' + id + '</td>',
                                '<td class="col-xs-3"> ' + num + '</td>',
                            '</tr>'
                        ].join('');
                    };
                    list.map(function(item) {
                        $('#blacklist .blist_table tbody').append(template(item.id, item.filtered_num));
                    });
                } else {
                    console.log(_err);
                }
            });
        });
    });
};

var progress_work = function(percent, change_value) {
    var progress_bar = $('#result .progress-bar');
    var progress_text = $('#result .progress-bar .progress-text');
    progress_bar.width(percent + '%');
    progress_text.text(percent + '% Filtered');
    if (change_value) {
        progress_bar.data('value', percent);
    }

    if (percent == 0) {
        progress_bar.removeClass('progress-bar-success').removeClass('progress-bar-warning').removeClass('progress-bar-danger');
    } else if (percent < 30) {
        progress_bar.addClass('progress-bar-success');
    } else if (percent < 70) {
        progress_bar.removeClass('progress-bar-success').addClass('progress-bar-warning');
    } else {
        progress_bar.removeClass('progress-bar-warning').addClass('progress-bar-danger');
    }
};

var zoom = 0.90;
var linespace = 1.00;
var increment = 0.05;

var webSocket;
var tab = "&nbsp;&nbsp;&nbsp;&nbsp";
var space = "&nbsp;";

var isRunning = true;
var logScrolling = true;

var filter = "";

var localstoragekey = "quarkus_logging_manager_state";

$('document').ready(function () {
    hideLog();
    loadSettings();
    
    openSocket();
    // Make sure we stop the connection when the browser close
    window.onbeforeunload = function () {
        closeSocket();
    };
    
    logstreamResizeButton.addEventListener("mousedown", function(e){
        m_pos = e.y;
        document.addEventListener("mousemove", resize, false);   
    }, false);

    document.addEventListener("mouseup", function(){
        document.removeEventListener("mousemove", resize, false);
    }, false);
    
    logstreamStopStartButton.addEventListener("click", stopStartEvent);
    logstreamClearLogButton.addEventListener("click", clearScreenEvent);
    logstreamZoomOutButton.addEventListener("click", zoomOutEvent);
    logstreamZoomInButton.addEventListener("click", zoomInEvent);
    logstreamFollowLogButton.addEventListener("click", followLogEvent);
    logstreamFilterModalInputButton.addEventListener("click", applyFilter);
    
    addControlCListener();
    addEnterListener();
    addScrollListener();
    addLineSpaceListener();
    
    $('[data-toggle="tooltip"]').tooltip();    

    logstreamFilterModalInput.addEventListener("keyup", function(event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            logstreamFilterModalInputButton.click();
        }
    });
    
    $('#logstreamFilterModal').on('shown.bs.modal', function () {
        $('#logstreamFilterModalInput').trigger('focus');
    });
    
    // save settings on hide
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState == 'hidden') { 
            saveSettings();
        }
    });
    
});

function loadSettings(){
    if (localstoragekey in localStorage) {
        var state = JSON.parse(localStorage.getItem(localstoragekey));

        zoom = state.zoom;
        applyZoom();

        linespace = state.linespace;
        applyLineSpacing();

        logScrolling = state.logScrolling;
        applyFollowLog();

        $("#logstreamFilterModalInput").val(state.filter);
        applyFilter();
        
        $('#logstreamColumnsModalLevelIconSwitch').prop('checked', state.levelIconSwitch);
        $('#logstreamColumnsModalSequenceNumberSwitch').prop('checked', state.sequenceNumberSwitch);
        $('#logstreamColumnsModalDateSwitch').prop('checked', state.dateSwitch);
        $('#logstreamColumnsModalTimeSwitch').prop('checked', state.timeSwitch);
        $('#logstreamColumnsModalLevelSwitch').prop('checked', state.levelSwitch);
        $('#logstreamColumnsModalSourceClassFullAbbreviatedSwitch').prop('checked', state.sourceClassFullAbbreviatedSwitch);
        $('#logstreamColumnsModalSourceClassFullSwitch').prop('checked', state.sourceClassFullSwitch);
        $('#logstreamColumnsModalSourceClassSwitch').prop('checked', state.sourceClassSwitch);
        $('#logstreamColumnsModalSourceMethodNameSwitch').prop('checked', state.sourceMethodNameSwitch);
        $('#logstreamColumnsModalThreadIdSwitch').prop('checked', state.threadIdSwitch);
        $('#logstreamColumnsModalThreadNameSwitch').prop('checked', state.threadNameSwitch);
        $('#logstreamColumnsModalMessageSwitch').prop('checked', state.messageSwitch);        
    }    
}

function saveSettings(){
    // Running state
    var state = {
        "zoom": zoom,
        "linespace": linespace,
        "logScrolling": logScrolling,
        "filter": filter,
        "levelIconSwitch": $('#logstreamColumnsModalLevelIconSwitch').is(":checked"),
        "sequenceNumberSwitch": $('#logstreamColumnsModalSequenceNumberSwitch').is(":checked"),
        "dateSwitch": $('#logstreamColumnsModalDateSwitch').is(":checked"),
        "timeSwitch": $('#logstreamColumnsModalTimeSwitch').is(":checked"),
        "levelSwitch": $('#logstreamColumnsModalLevelSwitch').is(":checked"),
        "sourceClassFullAbbreviatedSwitch": $('#logstreamColumnsModalSourceClassFullAbbreviatedSwitch').is(":checked"),
        "sourceClassFullSwitch": $('#logstreamColumnsModalSourceClassFullSwitch').is(":checked"),
        "sourceClassSwitch": $('#logstreamColumnsModalSourceClassSwitch').is(":checked"),
        "sourceMethodNameSwitch": $('#logstreamColumnsModalSourceMethodNameSwitch').is(":checked"),
        "threadIdSwitch": $('#logstreamColumnsModalThreadIdSwitch').is(":checked"),
        "threadNameSwitch": $('#logstreamColumnsModalThreadNameSwitch').is(":checked"),
        "messageSwitch": $('#logstreamColumnsModalMessageSwitch').is(":checked")
    };

    localStorage.setItem(localstoragekey, JSON.stringify(state));
}

function showLog(){
    $("#logstreamFooter").css("height", "33vh");
    $("#logstreamManager").show();
    $("#logstreamViewLogButton").hide();
    $("#logstreamHideLogButton").show();
    var element = document.getElementById("logstreamManager");
    element.scrollIntoView({block: "end"});
}

function hideLog(){
    $("#logstreamFooter").css("height", "unset");
    $("#logstreamViewLogButton").show();
    $("#logstreamHideLogButton").hide();
    $("#logstreamManager").hide();
}

function resize(e){
    const dx = m_pos - e.y;
    m_pos = e.y;
    const panel = document.getElementById("logstreamFooter");
    panel.style.height = (parseInt(getComputedStyle(panel, '').height) + dx) + "px";
}

function addControlCListener(){
    // Add listener to stop
    var ctrlDown = false,
            ctrlKey = 17,
            cmdKey = 91,
            cKey = 67;

    $(document).keydown(function (e) {
        if (e.keyCode === ctrlKey || e.keyCode === cmdKey)
            ctrlDown = true;
    }).keyup(function (e) {
        if (e.keyCode === ctrlKey || e.keyCode === cmdKey)
            ctrlDown = false;
    });

    $(document).keydown(function (e) {
        if (ctrlDown && (e.keyCode === cKey))stopLog();
    });
}

function addScrollListener(){
    $(document).on('mousewheel DOMMouseScroll', function(event) {
        if (event.shiftKey) {
            if( event.originalEvent.detail > 0 || event.originalEvent.wheelDelta < 0 ) {
                zoomOutEvent();
            } else {
                zoomInEvent();
            }
            return false;
        }
    });
}

function addLineSpaceListener(){
    $(document).keydown(function (event) {
        if (event.shiftKey && event.keyCode === 38) {
            lineSpaceIncreaseEvent();
        }else if (event.shiftKey && event.keyCode === 40) {
            lineSpaceDecreaseEvent();
        }
    });
}

function addEnterListener(){
    $(document).keydown(function (e) {
        if (e.keyCode === 13 && !$('#logstreamFilterModal').hasClass('show')){
            writeResponse("</br>");
            var element = document.getElementById("logstreamLogTerminal");
            element.scrollIntoView({block: "end"});
        } 
    });
}

function stopStartEvent() {
    if (isRunning) {
        stopLog();
    } else {
        startLog();
    }
}

function stopLog() {
    webSocket.send("stop");
    writeResponse("<hr class='logstreamStopLogHr'/>");

    logstreamStopStartButton.innerHTML = "<i class='fas fa-play'></i>";
    $("#logstreamFollowLogButton").hide();
    isRunning = false;
}

function startLog() {
    webSocket.send("start");

    logstreamStopStartButton.innerHTML = "<i class='fas fa-stop'></i>";
    $("#logstreamFollowLogButton").show();
    isRunning = true;
}

function clearScreenEvent() {
    logstreamLogTerminalText.innerHTML = "";
}

function applyLineSpacing(){
    $('#logstreamLogTerminal').css("line-height", linespace);
}

function lineSpaceDecreaseEvent() {
    linespace = parseFloat(linespace) - parseFloat(increment);
    linespace = parseFloat(linespace).toFixed(2);
    showInfoMessage("<i class='fas fa-text-height'></i>" + space  + linespace);
    applyLineSpacing();
}

function lineSpaceIncreaseEvent() {
    linespace = parseFloat(linespace) + parseFloat(increment);
    linespace = parseFloat(linespace).toFixed(2);
    showInfoMessage("<i class='fas fa-text-height'></i>" + space  + linespace);
    applyLineSpacing();
}

function applyZoom(){
    $('#logstreamLogTerminalText').css("font-size", zoom + "em");
}

function zoomOutEvent() {
    zoom = parseFloat(zoom) - parseFloat(increment);
    zoom = parseFloat(zoom).toFixed(2);
    showInfoMessage("<i class='fas fa-search-minus'></i>" + space  + zoom);
    applyZoom();
}

function zoomInEvent() {
    zoom = parseFloat(zoom) + parseFloat(increment);
    zoom = parseFloat(zoom).toFixed(2);
    showInfoMessage("<i class='fas fa-search-plus'></i>" + space  + zoom);
    applyZoom();
}

function showInfoMessage(msg){
    $('#logstreamInformationSection').empty().show().html(msg).delay(3000).fadeOut(300);
}

function followLogEvent() {
    logScrolling = !logScrolling;
    applyFollowLog();
}

function applyFollowLog(){
    if (logScrolling) {
        $("#logstreamFollowLogButtonIcon").addClass("text-success");
        $("#logstreamFollowLogButtonIcon").addClass("fa-spin");
        showInfoMessage("<i class='fas fa-check-circle'></i>" + space  + "Autoscroll ON");
    }else{
        $("#logstreamFollowLogButtonIcon").removeClass("text-success");
        $("#logstreamFollowLogButtonIcon").removeClass("fa-spin");
        showInfoMessage("<i class='fas fa-times-circle'></i>" + space  + "Autoscroll OFF");
    }
}

function scrollToTop() {
    logScrolling = false;
}

function scrollToBottom() {
    logScrolling = true;
}

function applyFilter(){
    filter = $("#logstreamFilterModalInput").val();
    if(filter===""){
        clearFilter();
    }else{
        logstreamCurrentFilter.innerHTML = "<span style='border-bottom: 1px dotted;'>" + filter + " <i class='fas fa-times-circle' onclick='clearFilter();'></i></span>";
        
        var currentlines = $("#logstreamLogTerminalText").html().split('<!-- logline -->');
        
        var filteredHtml = "";
        var i;
        for (i = 0; i < currentlines.length; i++) {
            var htmlline = currentlines[i];
            filteredHtml = filteredHtml + getLogLine(htmlline) + "<!-- logline -->";
        } 
        
        logstreamLogTerminalText.innerHTML = "";
        writeResponse(filteredHtml);
    }
    $('#logstreamFilterModal').modal('hide');
}

function getLogLine(htmlline){
    if(filter===""){
        return htmlline;
    }else{
        
        var textline = $(htmlline).text();
        if(textline.includes(filter)){
            return htmlline;
        }else{
            return htmlline.replace('<span>', '<span class="logstreamFilteredOut">');
        }
    }
}

function clearFilter(){
    filter = "";
    $("#logstreamFilterModalInput").val("");
    logstreamCurrentFilter.innerHTML = "";
    
    var currentlines = $("#logstreamLogTerminalText").html().split('<!-- logline -->');
        
    var filteredHtml = "";
    var i;
    for (i = 0; i < currentlines.length; i++) {
        var htmlline = currentlines[i].replace('<span class="logstreamFilteredOut">', '<span>');
        filteredHtml = filteredHtml + htmlline + "<!-- logline -->";
    } 

    logstreamLogTerminalText.innerHTML = "";
    writeResponse(filteredHtml);
}

function getLevelIcon(level) {
    if($('#logstreamColumnsModalLevelIconSwitch').is(":checked")){
        level = level.toUpperCase();
        if (level === "WARNING" || level === "WARN")
            return "<i class='levelicon text-warning fas fa-exclamation-circle'></i>" + tab;
        if (level === "SEVERE" || level === "ERROR")
            return "<i class='levelicon text-danger fas fa-radiation'></i>" + tab;
        if (level === "INFO")
            return "<i class='levelicon text-primary fas fa-info-circle'></i>" + tab;
        if (level === "DEBUG")
            return "<i class='levelicon text-secondary fas fa-bug'></i>" + tab;

        return "<i class='levelicon fas fa-circle'></i>" + tab;
    }
    return "";
}

function getSequenceNumber(sequenceNumber){
    if($('#logstreamColumnsModalSequenceNumberSwitch').is(":checked")){
        return "<span class='badge badge-info'>" + sequenceNumber + "</span>" + tab;   
    }
    return "";
}

function getDateString(timestamp){
    if($('#logstreamColumnsModalDateSwitch').is(":checked")){
        return timestamp.toLocaleDateString() + space;
    }
    return "";
}

function getTimeString(timestamp){
    if($('#logstreamColumnsModalTimeSwitch').is(":checked")){
        return timestamp.toLocaleTimeString() + tab;
    }
    return "";
}

function getLevelText(level) {
    if($('#logstreamColumnsModalLevelSwitch').is(":checked")){
        level = level.toUpperCase();
        if (level === "WARNING" || level === "WARN")
            return "<span class='text-warning'>WARN" + space + "</span>" + tab;
        if (level === "SEVERE" || level === "ERROR")
            return "<span class='text-danger'>ERROR</span>" + tab;
        if (level === "INFO")
            return "<span class='text-primary'>INFO" + space + "</span>" + tab;
        if (level === "DEBUG")
            return "<span class='text-secondary'>DEBUG</span>" + tab;

        return level + tab;
    }
    return "";
}

function getClassFullAbbreviatedName(sourceClassNameFull, sourceClassNameFullShort) {
    if($('#logstreamColumnsModalSourceClassFullAbbreviatedSwitch').is(":checked")){
        return "<span class='text-primary' data-toggle='tooltip' data-placement='top' title='" + sourceClassNameFull + "'>[" + sourceClassNameFullShort + "]</span>" + space;
    }
    return "";
}

function getFullClassName(sourceClassNameFull) {
    if($('#logstreamColumnsModalSourceClassFullSwitch').is(":checked")){
        return "<span class='text-primary'>[" + sourceClassNameFull + "]</span>" + space;
    }
    return "";
}

function getClassName(className) {
    if($('#logstreamColumnsModalSourceClassSwitch').is(":checked")){
        return "<span class='text-primary'>[" + className + "]</span>" + space;
    }
    return "";
}

function getMethodName(methodName) {
    if($('#logstreamColumnsModalSourceMethodNameSwitch').is(":checked")){
        return methodName + tab;
    }
    return "";
}

function getThreadId(threadName, threadId) {
    if($('#logstreamColumnsModalThreadIdSwitch').is(":checked")){
        return "<span class='text-success' data-toggle='tooltip' data-placement='top' title='Thread Name: " + threadName + "'>(" + threadId + ")</span>" + tab;
    }
    return "";
}

function getThreadName(threadName, threadId) {
    if($('#logstreamColumnsModalThreadNameSwitch').is(":checked")){
        return "<span class='text-success' data-toggle='tooltip' data-placement='top' title='Thread Id: " + threadId + "'>(" + threadName + ")</span>" + tab;
    }
    return "";
}

function getLogMessage(message){
    if($('#logstreamColumnsModalMessageSwitch').is(":checked")){
        return message;
    }
    return "";
}

function enhanceStacktrace(loggerName, stacktrace) {
    var enhanceStacktrace = [];
    var lines = stacktrace.split('\n');
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (line) {
            var startWithAt = line.startsWith("at ");
            if (!startWithAt) {
                var parts = line.split(":");
                line = "<b>" + parts[0] + ":</b>" + parts[1];
            } else {
                var isMyClass = line.includes(loggerName);
                if (isMyClass && loggerName) {
                    line = '<b>' + line + '</b>';
                }
                line = tab + tab + line;
            }
        }
        enhanceStacktrace.push(line + '<br/>');
    }
    var newStacktrace = enhanceStacktrace.join('');
    return "<span class=\"text-wrap text-danger\">" + newStacktrace + "</span>";
}

function writeResponse(text) {
    var logfile = $('#logstreamLogTerminalText');
    logfile.append(text);
    if (logScrolling) {
        var element = document.getElementById("logstreamLogTerminal");
        element.scrollIntoView({block: "end"});
    }
    // TODO: Trim the top if it gets too big ?
}

function openSocket() {
    // Ensures only one connection is open at a time
    if (webSocket !== undefined && webSocket.readyState !== WebSocket.CLOSED) {
        writeResponse("Already connected...");
        return;
    }
    // Create a new instance of the websocket
    var loc = window.location, new_uri;
    if (loc.protocol === "https:") {
        new_uri = "wss:";
    } else {
        new_uri = "ws:";
    }
    var pathname = loc.pathname;
    var devpath = pathname.substr(0, pathname.indexOf('/dev/'));
    new_uri += "//" + loc.host + devpath + "/dev/logstream";
    webSocket = new WebSocket(new_uri);

    webSocket.onmessage = function (event) {
        var json = JSON.parse(event.data);
        
        if(json.type === "logLine"){
            messageLog(json);
        }else if(json.type === "init"){
            populateLoggerLevelModal(json.loggers,json.levels);
        }
    };

    webSocket.onclose = function () {
        saveSettings();
        if (isRunning) {
            stopLog();
        }
        writeResponse("Connection closed<br/>");
    };

    function messageLog(json) {
        
        var timestamp = new Date(json.timestamp);
        var level = json.level;

        var htmlLine = "<span>" + 
            getLevelIcon(level)
                + getSequenceNumber(json.sequenceNumber)
                + getDateString(timestamp)
                + getTimeString(timestamp)
                + getLevelText(level)
                + getClassFullAbbreviatedName(json.sourceClassNameFull, json.sourceClassNameFullShort)
                + getFullClassName(json.sourceClassNameFull)
                + getClassName(json.sourceClassName)
                + getMethodName(json.sourceMethodName)
                + getThreadId(json.threadName, json.threadId)
                + getThreadName(json.threadName, json.threadId)
                + getLogMessage(json.formattedMessage) + "<br/>";
                
        if (json.stacktrace) {
            for (var i in json.stacktrace) {
                var stacktrace = enhanceStacktrace(json.loggerName, json.stacktrace[i]);
                htmlLine = htmlLine + stacktrace;
            }
        }
        
        htmlLine = htmlLine + "</span><!-- logline -->";
        
        if(filter!=""){
            writeResponse(getLogLine(htmlLine));
        }else{
            writeResponse(htmlLine);
        }   
    }
}

function closeSocket() {
    webSocket.close();
}

function populateLoggerLevelModal(loggerNamesArray, levelNamesArray){
    var tbodyLevels = $('#logstreamLogLevelsModalTableBody');
    
    // Populate the dropdown
    for (var i = 0; i < loggerNamesArray.length; i++) {
        var row = "<tr><td id='" + createLevelRowId(loggerNamesArray[i].name) + "' class=" + getTextClass(loggerNamesArray[i].effectiveLevel) + ">" + loggerNamesArray[i].name + "</td><td>" + createDropdown(loggerNamesArray[i].name, loggerNamesArray[i].effectiveLevel,levelNamesArray) + "</td></tr>";
        tbodyLevels.append(row);
    }
    
    $('select').on('change', function() {
        changeLogLevel(this.value, $(this).find('option:selected').text());
    });
    
    populated = true;
}

function createLevelRowId(logger){
    var name = logger + "_row";
    return name.replaceAll(".", "_");
}

function getTextClass(level){
    level = level.toUpperCase();
    if (level === "WARNING" || level === "WARN")
        return "text-warning";
    if (level === "SEVERE" || level === "ERROR")
        return "text-danger";
    if (level === "INFO")
        return "text-primary";
    if (level === "DEBUG")
        return "text-secondary";

    return "";
}

function createDropdown(name, level, levelNamesArray){
    
    var dd = "<select class='custom-select custom-select-sm'>";
    // Populate the dropdown
    for (var i = 0; i < levelNamesArray.length; i++) {
        var selected = "";
        if(level === levelNamesArray[i]){
            selected = "selected";
        }
        dd = dd + "<option " + selected + " value='" + name + "'>" + levelNamesArray[i] +"</option>";
    }
    dd = dd + "</select>";
    
    return dd;
}

function changeLogLevel(val,text){
    webSocket.send("update|" + val + "|" + text);
    // Also change the style of the row
    var id = createLevelRowId(val);
    $('#' + id).removeClass();
    $('#' + id).addClass(getTextClass(text));    
}
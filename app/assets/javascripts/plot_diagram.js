

// Zeichnen eines Flot- Diagrammes aus den übergebenen Datentupeln
// Parameter:
// Unique-ID fuer Bildung der Canvas-ID
// DOM-ID of DIV for plotting
// Kopfzeile
// Daten-Array
// multiple_y_axes  bool
// show_y_axes      bool
// x_axis_time      bool    Ist X-Achse ein Zeitstempel oder Nummer
function plot_diagram(unique_id, plot_area_id, caption, data_array, multiple_y_axes, show_y_axes, x_axis_time) {
    var plot_area = jQuery('#'+plot_area_id);

    function pad2(number){          // Vornullen auffuellen für Datum etc.
        var str=''+number;
        if (str.length < 2){
            str = '0' + str;
        }
        return str;
    }

    function remove_diagram(){      // Komplettes Diagramm entfernen
        plot_area.html("");                                  // Area putzen
    }

    var canvas_id = "canvas_" + unique_id;
    var head_id = "head_" + canvas_id;
    var canvas_height = 450;

    // interne Struktur des gegebenen DIV anlegen mit 2 DIVs
    plot_area
        .css("background-color", "white")
        .html('<div id="'+head_id+'" style="float:left; width:100%; background-color: white; padding-bottom: 5px;"></div>'+
            '<div id="'+canvas_id+'" style="float:left; width:100%; height: '+canvas_height+'px; background-color: white; "></div>'
        );

    // Header-Bereich belegen
    jQuery('#'+head_id)
        .html('<div style="float:left; padding:3px;">'+caption+'</div><div align = "right"><input class="close_diagram_'+unique_id+'" type="button" title="Diagramm Schliessen" value="X"></div>')
        .css('margin-top', '5px')
        .find(".close_diagram_"+unique_id).click(function(){remove_diagram()});

    // Unterschiedliche IDs fuer Y-Achsen vergeben, wenn separat darzustellen
    jQuery.each(data_array, function(i,val){
        if (multiple_y_axes==true)
            val.yaxis = data_array.length-i;
        else
            val.yaxis = 1;
    });

    plot_options = {
        series:     {lines: { show: true }, points: { show: true }},
        crosshair:  { mode: "x" },
        grid:       { hoverable: true, autoHighlight: false },
        yaxis:      { min: 0, show: show_y_axes==true },
        legend:     { position: "ne"}
    };
    if (x_axis_time){
        plot_options["xaxes"] = [{ mode: 'time' }]
    }
    var plot = jQuery.plot(jQuery('#'+canvas_id), data_array, plot_options);     // Ausgabe des Diagrammes auf Canvas

    if (data_array.length == 0){
        return;                                   // Aufbereitung des Diagrammes verlassen wenn gar keine Daten zum Zeichnen
    }


    // ############ Context-Menü

    jQuery('#'+canvas_id).contextPopup({
        title: 'Diagramm',
        items: [
            {
                label: (show_y_axes==true ? "y-Achse(n) ausblenden" : "y-Achse(n) anzeigen"),
                icon: 'assets/application-monitor.png',
                action: function(){
                    plot_area.html(""); // Altes Diagramm entfernen
                    plot_diagram(unique_id, plot_area_id, caption, data_array, multiple_y_axes, (show_y_axes==true ? false : true), x_axis_time);
                }
            },
            {
                label: (multiple_y_axes==true ? "Alle Kurven in einer y-Achse darstellen" : "Eigene y-Achse je Kurve (100% Wertebereich)"),
                icon: 'assets/application-monitor.png',
                action: function(){
                    plot_area.html(""); // Altes Diagramm entfernen
                    plot_diagram(unique_id, plot_area_id, caption, data_array, (multiple_y_axes==true ? false : true), show_y_axes, x_axis_time);
                }
            }
        ]
    });

    // ############ crosshair.Anzeige aktualisieren
    var updateLegendTimeout = null;
    var latestPosition = null;

    var legends = jQuery('#'+canvas_id+" .legendLabel");
    legends.each(function () {
        // fix the widths so they don't jump around
        jQuery(this).css('width', jQuery(this).width()+10);
    });

    // Legendenzeile für X-Achse hinzufügen
    var x_legend_title;
    if (plot_options.xaxes[0].mode == "time"){
        x_legend_title = "Time";
    } else {
        x_legend_title = 'X';
    }
    jQuery('#'+canvas_id+" .legend").find("tbody").append("<tr><td align='center'>"+x_legend_title+"</td><td class='legendXAxis'></td></tr>");
    var legendXAxis =jQuery('#'+canvas_id+" .legendXAxis");

    // Titel zu Skalen der spalten hinzufuegen, wenn multiple y-Achsen angezeigt werden
    if (multiple_y_axes==true){

        jQuery.each(data_array, function(i,val){
            jQuery('#'+canvas_id+" .y"+(data_array.length-i)+"Axis").attr("title", val.label);
        });
    }

    function updateLegend() {
        updateLegendTimeout = null;
        var pos = latestPosition;

        var axes = plot.getAxes();
        if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max ||
            pos.y < axes.yaxis.min || pos.y > axes.yaxis.max)
            return;

        var i, j, dataset = plot.getData();
        for (i = 0; i < dataset.length; ++i) {
            var series = dataset[i];

            // find the nearest points, x-wise
            for (j = 0; j < series.data.length; ++j)
                if (series.data[j][0] > pos.x)
                    break;

            // now interpolate
            var y, p1 = series.data[j - 1], p2 = series.data[j];
            if (p1 == null)
                y = p2[1];
            else if (p2 == null)
                y = p1[1];
            else
                y = p1[1] + (p2[1] - p1[1]) * (pos.x - p1[0]) / (p2[0] - p1[0]);

            legends.eq(i).text(series.label + "= " + y.toFixed(2));
        }
        // Zeitpunkt des Crosshairs in X-Axis anzeigen
        if (plot_options.xaxes[0].mode == "time"){
            var time = new Date(pos.x);
            legendXAxis.html(pad2(time.getUTCDate())+"."+pad2(time.getUTCMonth()+1)+"."+time.getUTCFullYear()+" "+pad2(time.getUTCHours())+":"+pad2(time.getUTCMinutes()));   // Anzeige des aktuellen wertes der X-Achse
        } else {
            legendXAxis.html(pos.x);
        }
    }


    // ############ MouseOver-Hint Anzeige aktualisieren
    var previousToolTipPoint = null;
    var toolTipID = canvas_id+"_ToolTip"

    function showTooltip(x, y, contents) {
        $('<div id="'+toolTipID+'">' + contents + '</div>').css( {
            position: 'absolute',
            display: 'none',
            top: y + 5,
            left: x + 5,
            border: '1px solid #fdd',
            padding: '2px',
            'background-color': '#fee',
            opacity: 0.80
        }).appendTo("body").fadeIn(300);
    }


    // ############ Events binden
    jQuery('#'+canvas_id).bind("plothover",  function (event, pos, item) {
        latestPosition = pos;
        if (!updateLegendTimeout)
            updateLegendTimeout = setTimeout(updateLegend, 50);     // Zeitverzögertes Ausfrufen von updateLegend für crosshair und Aktualisierung Legende
        if (item) {
            if (previousToolTipPoint != item.dataIndex) {
                previousToolTipPoint = item.dataIndex;
                $("#"+toolTipID).remove();
                // Label ist schon durch Crosshair mit Anfangs-Wert belegt, diesen durch aktuellen ersetzen
                showTooltip(item.pageX, item.pageY, item.series.label + "= " + item.datapoint[1].toFixed(2)   );
            }
        }
        else {
            $("#"+toolTipID).remove();
            previousToolTipPoint = null;
        }

    });

    jQuery('#'+canvas_id+" .legend").draggable().css("left", -9).css("top", canvas_height*-1+9); // Legende verschiebbar gestalten, da dann mit position:relative gearbeitet wird, muss neu positioniert werden

} // plot_diagram

// Zeichnen eines Diagrammes mit den Daten einer table-Spalte
// Parameter:
// ID der Table
// ID des DIVs fuer Plotting
// Kopfzeile
// Name der Spalte, die ein/ausgeschalten wird
function plot_table_diagram(table_id, plot_area_id, caption, column_name, multiple_y_axes, show_y_axes) {

    function get_content(td_field){         // Ermitteln des html-Inhaltes einer TD-Zelle bzw. ihrer Kinder, wenn weitere enthalten sind
        var td_content;
        if (td_field.children().length > 0){     // <td> enthält Kinder
            td_content = td_field.children().html();
        } else {
            td_content = td_field.html();
        }
        return td_content;
    }

    function get_numeric_content(td_field){ // Ermitteln des numerischen html-Inhaltes einer TD-Zelle bzw. ihrer Kinder, wenn weitere enthalten sind
        var td_content = get_content(td_field);
        if (session_locale == 'de'){   // globale Variable session_locale wird gesetzt bei Anmeldung in EnvController.setDatabase
            td_content = parseFloat(td_content.replace(/\./g, "").replace(/,/,"."));   // Deutsche nach englische Float-Darstellung wandeln (Dezimatrenner, Komma)
        }
        if (session_locale == 'en'){   // globale Variable session_locale wird gesetzt bei Anmeldung in EnvController.setDatabase
            td_content = parseFloat(td_content.replace(/\,/g, ""));                   // Englische Float-Darstellung wandeln, Tausend-Separator entfernen
        }
        return td_content;
    }

    function get_date_content(td_field){ // Ermitteln des html-Inhaltes einer TD-Zelle bzw. ihrer Kinder, wenn weitere enthalten sind, als Date
        var parsed_field = get_content(td_field);
        if (session_locale == 'de'){
            var all_parts = parsed_field.split(" ");
            var date_parts = all_parts[0].split(".");
            parsed_field = date_parts[2]+"/"+date_parts[1]+"/"+date_parts[0]+" "+all_parts[1]   // Datum ISO neu zusammengsetzt + Zeit
        }
        if (session_locale == 'en'){
            parsed_field= parsed_field.replace(/-/g,"/");       // Umwandeln "-" nach "/", da nur so im Date-Konstruktor geparst werden kann
        }
        return new Date(parsed_field+" GMT");
    }

    //Sortieren eines DataArray nach dem ersten Element des inneren Arrays (X-Achse)
    function data_array_sort(a,b){
        return a[0] - b[0];
    }



    var columns = jQuery('#'+table_id).data('columns');     // JS-Objekt mit Spalten-Struktur gespeichert an DOM-Element

    // Spaltenheader der Spalte mit class 'plottable' versehen oder wegnehmen wenn bereits gesetzt (wenn Column geschalten wird)
    if (column_name && column_name != ""){                            // nur Aufrufen wenn column_name wirklich belegt ist
        if (columns[column_name]['plottable'] == 1) {
            columns[column_name]['plottable'] = 0;
        } else {
            columns[column_name]['plottable'] = 1;
        }

    }

    jQuery('#'+table_id).data('columns', columns);          // Rueckschreiben der Spalten-Info in DOM-Objekt

    var plot_master_column_index = null;                    // Spalten-Nr. der Plotmaster-Spalte
    var plot_master_time_column_index=null;                 // Spalten-Nr. der Plotmaster-Spalte, wenn diese Zeit als Inhalt hat
    var plotting_column_count = 0;          // Anzahl der zu zeichnenden Spalten
    var i = 0;
    for (var key in columns) {
        if (columns[key]['plot_master']){       // ermitteln der Spalte, die plot_master für X-Achse ist
            if (plot_master_column_index){ alert("Only one column may have attribute 'plot_master'");}
            plot_master_column_index = i;
        }
        if (columns[key]['plot_master_time']){              // ermitteln der Spalte, die plot_master für X-Achse ist mit Zeit als Inhalt
            if (plot_master_time_column_index){ alert("Only one column may have attribute 'plot_master_time'");}
            plot_master_column_index = i;
            plot_master_time_column_index=i;
        }
        if (columns[key]['plottable'] == 1){
            plotting_column_count++;
        }
        i++;
    }
    if (plot_master_column_index == null){
        alert('Fehler: Keine <th>-Spalte besitzt die Klasse "plot_master"! Exakt eine Spalte mit dieser Klasse wird erwartet');
    }

    var x_axis_time = false;       // Defaut, wenn keine plot_master_time gesetzt werden
    var data_array = [];
    var plotting_index = 0
    // Iteration ueber plotting-Spalten
    for (var key in columns) {
        var column = columns[key]                                          // konkretes Spalten-Objekt aus DOM
        if (column['plottable']==1){                              // nur fuer zu zeichnenden Spalten ausführen
            header_index = column   ['index']
            var col_data_array = [];
            // Iteration ueber alle Records der Tabelle
            var max_column_value = 0;               // groessten Wert der Spalte ermitteln für notwendige Breite der Anzeige
            jQuery('#'+table_id).find('tr').each(function(index, rec){
                if (index > 0) {                      // Ausblenden der Header-Zeile
                    var x_val = null;
                    var y_val = null;
                    // Aufbau eines Tupels aus Plot_master und plottable-Spalte
                    jQuery(rec).children('td').each(function(field_index, field){      // Iteration über Felder des Records, gesucht wird Index der aktuellen plottable-spalte
                        var td_field = jQuery(field);
                        if (field_index == header_index){
                            y_val = get_numeric_content(td_field);
                            if (y_val > max_column_value){              // groessten wert der Spalte ermitteln
                                max_column_value = y_val;
                            }
                        }
                        if (field_index ==plot_master_column_index){
                            if (field_index==plot_master_time_column_index){
                                x_val = get_date_content(td_field).getTime();       // Zeit in ms seit 1970
                                x_axis_time = true;       // mindestens ein plot_master_time gesetzt werden
                            } else {
                                x_val = get_numeric_content(td_field);
                            }
                        }
                    });
                    col_data_array.push( [ x_val, y_val ]);
                }
            });
            col_data_array.sort(data_array_sort);      // Data_Array der Spalte nach X-Achse sortieren
            col_attr = {label:columns[key]['caption'],
                data: col_data_array
            }
            data_array.push(col_attr);   // Erweiterung des primären arrays
            plotting_index = plotting_index + 1;  // Weiterzaehlen Index
        }
    }


    plot_diagram(
        table_id,
        plot_area_id,
        caption,
        data_array,
        multiple_y_axes,
        show_y_axes,
        x_axis_time
    );
} // plot_table_diagram









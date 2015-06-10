# encoding: utf-8
class DragnetController < ApplicationController
  include DragnetHelper

  # Auswahl-Liste für jstree als json -Array mit folgender Struktur
  # Expected format of the node in json buffer (there are no required fields)
  # {
  #   id          : "string" // will be autogenerated if omitted
  #   text        : "string" // node text
  #   icon        : "string" // string for custom
  #   state       : {
  #     opened    : boolean  // is the node open
  #     disabled  : boolean  // is the node disabled
  #     selected  : boolean  // is the node selected
  #   },
  #   children    : []  // array of strings or objects
  #   li_attr     : {}  // attributes for the generated LI node
  #   a_attr      : {}  // attributes for the generated A node
  # }
  def get_selection_list

    # liefert einen Eintrag mit Untermenu
    def render_entry_json(global_id_prefix, inner_id, entry)
      result =
          "{
  \"id\": \"#{"#{global_id_prefix}_#{inner_id}"}\",
  \"text\": \"#{inner_id+1}. #{entry[:name]}\",
  \"state\": { \"opened\": false }
"
      if entry[:entries]                                                        # Menu-Knoten
        result << ", \"children\": ["
        entry_id = 0
        entry[:entries].each do |e|
          result << render_entry_json("#{global_id_prefix}_#{inner_id}", entry_id, e)
          entry_id = entry_id + 1
        end
        result[result.length-1] = ' '                                           # letztes Komma entfernen
        result << "]"
      else
        result << ", \"icon\":\"assets/application-monitor.png\""
      end
      result << "},"
      result
    end

    response = '['                                                              # JSON-Buffer
    entry_id = 0
    dragnet_sql_list.each do |s|
      response << render_entry_json('', entry_id, s)
      entry_id = entry_id + 1
    end
    response[response.length-1] = ' '                                           # letztes Komma entfernen
    response << ']'

 #   response = '["Text1", "Text2"]'

    render :json => response.html_safe, :status => 200
  end

  private
  # Über zusammengesetzte ID der verschiedenen Hierarchien Objekt-Referenz in dragnet_sql_list finden
  def extract_entry_by_entry_id(entry_id)
    entry_ids = entry_id.split('_')
    entry_ids.delete_at(0)                                                        # ersten Eintrag entfernen

    entry = nil
    entry_ids.each do |e|
      if entry.nil?
        entry = dragnet_sql_list[e.to_i]                                          # x-tes Element aus erster Hierarchie-Ebene
      else
        entry = entry[:entries][e.to_i]                                           # x-tes Element aus innerer Hierarchie
      end
    end
    entry
  end


  public

  def refresh_selected_data
    entry = extract_entry_by_entry_id(params[:entry_id])

    parameter = ""
    if entry[:parameter]        # Parameter erwähnt (erwartet als Array)
      entry[:parameter].each do |p|
        parameter << "<div title='#{p[:title]}'>#{p[:name]} <input name='#{p[:name]}' size='#{p[:size]}' value='#{p[:default]}' type='text'></div><br/>"
      end
    end
    respond_to do |format|
      format.js {render :js => "$('#show_selection_header_area').html('<b>#{j my_html_escape(entry[:name]) }</b>');
                                $('#show_selection_hint_area').html('#{j my_html_escape(entry[:desc]) }');
                                $('#show_selection_param_area').html('#{j parameter }');
                                $('#dragnet_show_selection_do_selection').prop('disabled', #{entry[:sql] ? 'false' : 'true'});
                                $('#dragnet_show_selection_show_sql').prop('disabled', #{entry[:sql] ? 'false' : 'true'});
                                $('#dragnet_hidden_entry_id').val('#{params[:entry_id]}');
                               "
      }
    end
  end


  # Ausführen Report
  def exec_dragnet_sql
    dragnet_sql = extract_entry_by_entry_id(params[:dragnet_hidden_entry_id])

    if params[:commit_show]    # Verzweigen auf weitere Funktion bei Anwahl zweiter Button
      show_used_sql(dragnet_sql)
      return
    end


    # Headerzeile des Report erstellen, Parameter ermitteln
    @caption = "#{dragnet_sql[:name]}"
    command_array = [dragnet_sql[:sql]]
    if dragnet_sql[:parameter]
      @caption << ": "
      dragnet_sql[:parameter].each do |p|   # Binden evtl. Parameter
        command_array << params[p[:name]]           # Parameter aus Form mit Name erwartet
        @caption << " '#{p[:name]}' = #{params[p[:name]]}"  # Ausgabe im Header
      end
    end



    # Ausführen des SQL
    @res = sql_select_all command_array

    # Optionales Filtern des Results
    if dragnet_sql[:filter_proc]
      raise "filter_proc muss Klasse proc besitzen für #{dragnet_sql[:name]}" if dragnet_sql[:filter_proc].class.name != 'Proc'
      res = []
      @res.each do |r|
        res << r if dragnet_sql[:filter_proc].call(r)
      end
      @res = res
    end

    respond_to do |format|
      format.js {render :js => "$('##{params[:update_area]}').html('#{j render_to_string :partial=>"list_dragnet_sql_result" }');"}
    end
  end

  def show_used_sql(dragnet_sql)
    respond_to do |format|
      format.js {render :js => "$('##{params[:update_area]}').html('#{j "<div class='float_left' style='background-color:lightgray; margin-top: 10px;'><pre>#{my_html_escape(dragnet_sql[:sql])}</pre></div>" }');"}
    end
  end

end
/*
 *  USEPA Office of Water (OW) - Office of Science and Technology (OST)
 *  National Recommended Water Quality Criteria - Human Health Criteria Calculator
 * 
 * James Bisese
 * james.bisese@tetratech.com
 * Tetra Tech Fairfax VA
 * September 13, 2016
 * 
 */   

 // This list contains the mapping for the fixed cells (constants) in the source excel spreadsheet
var constants_table = {
	'$C$3': {'name':	"Body Weight", 'variable':	'BW', 'value':	'80' },
	'$C$4':	{'name':	"Drinking Water Intake", 'variable':	'DW', 'value':	'2.4' },	
	'$C$5':	{'name':	"Fish Consumption Rate for Aquatic Trophic Level 2", 'variable':	'FCR_2', 'value':	'0.0078', 'percentage':  0.356807511737089},
	'$C$6':	{'name':	"Fish Consumption Rate for Aquatic Trophic Level 3", 'variable':	'FCR_3', 'value':	'0.0089', 'percentage': 0.403755868544601},
	'$C$7':	{'name':	"Fish Consumption Rate for Aquatic Trophic Level 4", 'variable':	'FCR_4', 'value':	'0.0053', 'percentage': 0.23943661971831},
	'$C$8':	{'name':	"Fish Consumption Rate (Total)", 'variable':	'FCR_T', 'value':	'0.0220' },
	'$C$9':	{'name':	"Target excess lifetime cancer risk", 'variable':	'ELCR', 'value':	0.000001 }
};

// This list contains the mapping for the 'per-row' formulas in the source excel spreadsheet.  
// (Each row (each Pollutant) can have a different formula)
var row_translate_table = {
	'C': "cancer_slope",
	'D': "rel_source_cont",
	'E': "ref_dose",
	'F': "bio_acc_tl2",
	'G': "bio_acc_tl3",
	'H': "bio_acc_tl4",
	'I': "bio_acc_tot",
	'J': "bio_con"
};
// these are not calculated - they are included as reference only
var extra_chemicals = {
	1:{"order_by": 109, "chemical_nm": "2,3,7,8-TCDD (Dioxin)","footnotes": "a,b", "cas_number": "1746016", "fc_water_org":"--","fc_org":"--"},
	2:{"order_by": 9, "chemical_nm": "Arsenic","footnotes": "a,b,j","cas_number":"7440382","fc_water_org":"--","fc_org":"--"},
	3:{"order_by": 10, "chemical_nm": "Asbestos","footnotes": "a","cas_number":"1332214","fc_water_org":"7 million fibers/L","fc_org":"--"},
	4:{"order_by": 11, "chemical_nm": "Barium","footnotes": "a,e","cas_number":"7440393","fc_water_org":"1000","fc_org":"--"},
	5:{"order_by": 18, "chemical_nm": "Beryllium","footnotes": "a","cas_number":"7440417","fc_water_org":"--","fc_org":"--"},
	6:{"order_by": 27, "chemical_nm": "Cadmium","footnotes": "a","cas_number":"7440439","fc_water_org":"--","fc_org":"--"},
	7:{"order_by": 35, "chemical_nm": "Chromium (III)","footnotes": "a","cas_number":"16065831","fc_water_org":"Total","fc_org":"--"},
	8:{"order_by": 36, "chemical_nm": "Chromium (VI)","footnotes": "a,b","cas_number":"18540299","fc_water_org":"Total","fc_org":"--"},
	9:{"order_by": 38, "chemical_nm": "Copper","footnotes": "a,b,c","cas_number":"7440508","fc_water_org":"1300","fc_org":"--"},
	10:{"order_by": 63, "chemical_nm": "Manganese","footnotes": "c,f","cas_number":"7439965","fc_water_org":"50","fc_org":"100"},
	11:{"order_by": 70, "chemical_nm": "Nitrates","footnotes": "a","cas_number":"14797558","fc_water_org":"10000","fc_org":"--"},
	12:{"order_by": 74, "chemical_nm": "Nitro-sodiethylamine","footnotes": "b","cas_number":"55185","fc_water_org":"0.0008","fc_org":"1.24"},
	13:{"order_by": 79, "chemical_nm": "Pathogens and Pathogen Indicators","footnotes": "","cas_number":"n/a","fc_water_org":"See Recreational Criteria Table","fc_org":"--"},
	14:{"order_by": 82, "chemical_nm": "pH","footnotes": "","cas_number":"n/a","fc_water_org":"5-9","fc_org":"--"},
	15:{"order_by": 87, "chemical_nm": "Solids Dissolved and Salinity","footnotes": "","cas_number":"n/a","fc_water_org":"250000","fc_org":"--"},
	16:{"order_by": 89, "chemical_nm": "Thallium","footnotes": "","cas_number":"7440280","fc_water_org":"--","fc_org":"--"}
};

// Only allow numbers or decimal separator
// filter used on the 'Enter a Fish Consumption Rate' text input box.  
function isNumberKey(evt)
{
	var charCode = (evt.which) ? evt.which : evt.keyCode;
	if (charCode != 46 && charCode > 31 
		&& (charCode < 48 || charCode > 57))
			return false;
	return true;
}

// calculate data displayed in the table.  
function prepareData(consumption_value /* grams per day */, risk_code)
{
	// this is used for debugging.  it limits the number of rows shown in the table
	var limit_nu = 500;
	
	// convert 'user' units (grams/day) to computing units (kilograms/day)
	var fishConsumptionRate = consumption_value / 1000;
	
	$("#computed_label").html( 'Calculated<br>' + consumption_value + ' grams/day,<br>Cancer Risk Level 10<sup>-' + risk_code + '</sup>');
	//$("#computed_label2").html( 'Calculated<br>' + consumption_value + ' g/day,<br>CRL 10<sup>-' + risk_code + '</sup>');
	
	// this set is used if you want the QA/QC columns
	var colSet = ['chemical_label_tx','cas_number', "fc_water_org", "fc_org"];
	var colSet2 = ["equation_awqc_wat_org","equation_awqc_org"];
	
	var _tableData = [];
	
	var extraColSet = ["cas_number","fc_water_org", "fc_org","equation_awqc_wat_org","equation_awqc_org"]
	for (var key in extra_chemicals)
	{
		var row = extra_chemicals[key];
		
		var tableRow = [row['order_by']];
		tableRow.push(row['chemical_nm'] + '<sup>' + row['footnotes'] + '</sup>');
		for (var field in extraColSet)
		{
			if (field == 3 ||field == 4)
			{
				tableRow.push('--');
			}
			else
			{
				tableRow.push(row[extraColSet[field]]);
			}
		}
		_tableData.push(tableRow);
	}
	
	// this matches the 'round()' function in excel
	function excel_round(x, places)
	{
		var shift = Math.pow(10, places);
		return Math.round(x * shift) / shift;
	}
	
	function commafy(num){
		  var parts = (''+(num<0?-num:num)).split("."), s=parts[0], L, i=L= s.length, o='';
		  while(i--){ o = (i===0?'':((L-i)%3?'':',')) 
		                  +s.charAt(i) +o }
		  return (num<0?'-':'') + o + (parts[1] ? '.' + parts[1] : ''); 
		}
	
	// overwrite the consumption rate value
	constants_table['$C$8']['value'] = fishConsumptionRate;
	// the consupmption rate is applied through these values - which are the percentage of the fish from each trophic level
	constants_table['$C$5']['value'] = excel_round(fishConsumptionRate * constants_table['$C$5']['percentage'], 4);
	constants_table['$C$6']['value'] = excel_round(fishConsumptionRate * constants_table['$C$6']['percentage'], 4);
	constants_table['$C$7']['value'] = excel_round(fishConsumptionRate * constants_table['$C$7']['percentage'], 4);
	// this comes from the selected radio option 'Cancer Risk Level'
	constants_table['$C$9']['value'] =  Math.pow(10, -1 * risk_code);
	
	var i = 0; // this is juse used for debugging - including only some of the rows
	dataSet = DataSet['chemicals'];
	for (var key in dataSet)
	{
		if (i++ >= limit_nu)
			{
				break;
			}
		var row = dataSet[key];
		
		var tableRow = [row['order_by']]
		//if (! (row.chemical_nm == "1,1,1-Trichloroethane"))
		//{
		//	continue;
		//}

		for (var indx in colSet)
		{
			tableRow.push(row[colSet[indx]]);
		}
		
		for (var field in colSet2)
		{
			var equation = row[colSet2[field]];
			var equation_tx = equation;
			equation = equation.replace('=','');
			
			 // first replace the 'constants in the equation
			for (var string_tx in constants_table)
			{
				var reg = string_tx;
				var replace_value = constants_table[string_tx]['value'];
				function replaceString(replaceValue) {
				  return equation.replace(reg, function () { return replaceValue });
				}
				equation = replaceString(replace_value);
			}
			 // now replace the per-row holders
			for (var string_tx in row_translate_table)
			{
				var value_tx = row[row_translate_table[string_tx]];
				value_tx = value_tx.replace(',','') // remove commas in some numbers
				value_tx = value_tx.replace(',','') // remove commas in some numbers
				value_tx = value_tx.replace(',','') // remove commas in some numbers
				var reg = '$' + string_tx + '\\d+';
				var reg = new RegExp('\\$' + string_tx + '\\d+');
				var replace_value = value_tx;
				function replaceString(replaceValue) {
				  return equation.replace(reg, function () { return replaceValue });
				}
				equation = replaceString(replace_value);
			}
			result_va = eval(equation);
			var sig_figs_va = row['sig_figs_nu'] - 1 - Math.floor((Math.log(Math.abs(result_va)))/ Math.LN10);
			var rounded_result_va = excel_round(result_va, sig_figs_va);
			//rounded_result_va = rounded_result_va.toFixed(20).replace(/0+$/,'');
			
			//this is a hack to fix one number that comes out as ...
			if (rounded_result_va == '199999.99999999997')
			{
				rounded_result_va = '200000';
			}
			// put commas in the big numbers
			var final_value = commafy(rounded_result_va);
			// tweak for Methlymercury, which is reported in different units and doesn't have +water value
			if (row['cas_number'] == "22967926" )
			{
				if (final_value != 'NaN')
				{
					final_value += ' mg/kg';
				}
				else
				{
					final_value = '--';
				}
			}
			
			tableRow.push(final_value);
		}		
		_tableData.push(tableRow);
	}
	return _tableData;
};

// this holds a reference to the table that is used by all the functions that update the table.
var table = '';

// this runs when the page is first loaded
$(document).ready(function(){

	// default consumption value and cancer risk
	var consumption_rate = $("input[name=ddlConsumptionRate]:checked").val();
	var risk_code = $("input[name=cancer_risk]:checked").val();
	
	// create the table data using the default values
	var tableData = prepareData(consumption_rate, risk_code);

	// consult the DataTables documentation to understand this configuration
	table = $('#CriteriaTable').DataTable({
		"dom": 'Bfrtip',
		"autoWidth": false,
		"iDisplayLength": 200,
		"paging": false, 
		"info": false,
		"bJQueryUI": true,
		buttons: [
			'copy', 'csv', 
			{
				extend: 'excelHtml5',
				text: 'Excel',
				customize: function( xlsx ) {
					var sheet = xlsx.xl.worksheets['sheet1.xml'];
					$(sheet.firstElementChild.children['0'].childNodes).attr('width',24);
					$('col:first', sheet).attr('width', '12');
				}
			}, 'pdf', 'print'
		],
		"data": tableData,
		"columnDefs": [
			{ "width":  "25px !important", "targets": [0] },
			{ "width": "135px !important", "targets": [1] },
			{ "width":  "95px !important", "targets": [2] },
			{ "width": "100px !important", "targets": [3,4,5, 6] },
			{ "className": "dt-right", "targets": [ 3,4,5,6 ] }, 
			{ "className": "dt-head-center", "targets": [ 3,4,5,6] },
			{ "className": "dt-center", "targets": [ 2 ] }
		]
	} );
	
	var table_width = 900;
	
	$(".dataTables_wrapper").css("width",table_width + "px");
	
	$('.cb-colDisplay').click(function() {
		
		col_index = $(this).attr('column-index') * 1;
		
		var is_col_visible = table.column( col_index ).visible();
		
		for ( var i = col_index ; i <= col_index + 1 ; i++ ) 
		{
			var column = table.column( i );
			table.column( i ).visible( ! column.visible(), false );
		}
		
		table_width = $(".dataTables_wrapper").css("width");
		table_width = table_width.replace("px", "");
		table_width = table_width * 1
		if ( is_col_visible) {
			table_width = table_width - 236;
		}
		else {
			table_width = table_width + 236;;
		}
		$(".dataTables_wrapper").css("width", table_width + "px");
		table.columns.adjust().draw( false ); // adjust column sizing and redraw
	});  
	
	// display the table contained in the 'flash' div
	table.columns.adjust().draw( true );
	$('#flash').show();
});

$('input[name=ddlConsumptionRate]:radio').change(function() 
{
	consumption_rate = parseFloat($("input[name=ddlConsumptionRate]:checked").val());

	var textBox = document.getElementById('ddlManualConsumptionRate');
	if (consumption_rate == -999)
	{
		document.getElementById("ddlManualConsumptionRate").disabled = false;
		if ($("#ddlManualConsumptionRate").val() > 0)
		{
			$( "#ddlManualConsumptionRate" ).change();
		}
	}
	else
	{
		document.getElementById("ddlManualConsumptionRate").disabled = true;

		var cancer_risk_code = $("input[name=cancer_risk]:checked").val();
		
		var tableData = prepareData(consumption_rate, cancer_risk_code);

		table.clear();
		table.rows.add(tableData);
		table.draw();
	}
});

// update when the user changes the consumption rate using the text input box
$( "#ddlManualConsumptionRate" ).change(function() 
{
	var consumption_rate = parseFloat($("#ddlManualConsumptionRate").val()) ;

	var cancer_risk_code = $("input[name=cancer_risk]:checked").val();
	
	var tableData = prepareData(consumption_rate, cancer_risk_code);

	table.clear();
	table.rows.add(tableData);
	table.draw();
	$( "#ddlConsumptionRate" ).val('');
});

//update when the user changes the cancer risk rate using the radio buttons
$('input[name=cancer_risk]:radio').change(function()
{
	consumption_rate = parseFloat($("input[name=ddlConsumptionRate]:checked").val());
	if (consumption_rate == -999)
	{
		consumption_rate =  parseFloat($("#ddlManualConsumptionRate").val()) ;
	}

	var cancer_risk_code = $("input[name=cancer_risk]:checked").val();
	
	var tableData = prepareData(consumption_rate, cancer_risk_code);

	table.clear();
	table.rows.add(tableData);
	table.draw();
});

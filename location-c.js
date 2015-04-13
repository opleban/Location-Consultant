/**************************************

Pseudo Architecting 
Will use Pub/Sub or Observer Pattern or Flux 

LocationSelectorComponent

IndustrySelectorComponent

OccupationSelectorComponent

SoQLQuery Component

SocrataDataFetcherComponent 

ViewComponent

Queries to Make
Query Industry by state       `
  return top three
  Query Industry by State 

**************************************/
//Barebones, just enough to get the job done

var STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming"
];

var DATASET_LIBRARY = {
  lookup_table: "e49i-f9fh",
  wages_by_industry: "4ini-sjpi"
};
var SoQLQuery = (function(){
  var DEFAULT_YEAR = 2013,
      BASE_URL = '/resource/';

  function SoQLQuery(dataset_id){
    if (dataset_id){
      this.url = BASE_URL + dataset_id + '.json?';
    } else {
      throw "No dataset ID provided!";
    }
    //if a query is given, use it otherwise try and generate one
  };

  //ALLOWS YOU TO CONSTRUCT A QUERY
  SoQLQuery.prototype.generateQuery = function(options){
    var query = [];
    cached_query_store = {};
    if (options.select){
      query.push('$select=' + options.select);
    }
    if (options.where){
      query.push('$where=' + _generateWhereStatement(options.where));
    }
    if (options.q){
      query.push('$q=' + options.q);
    }
    if (options.orderBy){
      query.push('$order=' + _generateOrderStatement(options.order));
      //i.e. "compensation DESC"
    }
    if (options.group){
      query.push('$group=' + options.group);
    }
    if (options.take){
      query.push('$limit=' + options.limit);
    }
    this.query = query.join('&');
    console.log("SoQL query set to: ", this.query);
  };

  //ALLOWS YOU TO SET QUERY DIRECTLY 
  SoQLQuery.prototype.setQuery = function(options){
    this.query = options.query;
    console.log("SoQL query set to: ", this.query);
  };

  //Returns promise observable
  SoQLQuery.prototype.fetchData = function(){
    var that = this;
    queryURL = that.url;
    if (that.query){
      queryURL += that.query
    }
    return $.ajax({
      url: queryURL,
      dataType: 'json',
    }).promise();
  };

  //TODO: REFACTOR TO ALLOW GREATER CUSTOMIZATION
  function _generateWhereStatement(whereOption){
    var whereStatement = [];
    if (whereOption.state){
      whereStatement.push('geoname=' + options.state);
    }
    if (whereOption.industry){
      whereStatement.push('description=' + options.industry);
    }
    if (whereOption.line_code){
      whereStatement.push('line_code=' + options.line_code);
    }
    if (whereOption.industry_classification) {
      whereStatement.push('industry_classification=' + options.industry_classification);
    }
    if (whereOption.year){
      whereStatement.push('year=' + options.year);
    }
    return whereStatement.join(' AND ');
  }

  function _generateOrderStatement(orderOption){
    return orderOption.column + " " + orderOption.direction;
  }

  return SoQLQuery;
})();

  var InputComponent = (function(){


    var optionsSelectionsForm = $('#options-selection-form'),
        stateSelect = $('#state-input'),
        industrySelect = $('#industry-input'),
        industrySelected = false,
        occupationSelected = false,
        selectionMade = 0;

    function _searchList(list, text){
      if (text){
        return _.filter(list, function(item){
          return !!item.toLowerCase().match(new RegExp("^" + text.toLowerCase()));
        });
      }
    }

    function _getDatasetColumnValues(dataset_id, columnName){
      var queryObject = new SoQLQuery(dataset_id);
      var selection = columnName;
      queryObject.generateQuery({select:selection, group: columnName});
      //returns promise
      return queryObject.fetchData();
    }

    ////////////////////////////////////////////////////////////////////////////
    // INDUSTRY SELECTION
    ////////////////////////////////////////////////////////////////////////////

    //Pull out industry list from the Look Up table and append them to the industry datalist
    function _renderIndustryOptions(){
      var industryOptions = _lookUpTableObservable()
                          .selectMany(function(table){
                            return Rx.Observable.fromArray(table);
                          })
                          .map(function(row){
                            return row.description
                          })
      industryOptions.subscribe(function(industry){
        $('<option value="' + industry + '">' + industry).appendTo(industrySelect);
      })
    }

    function _renderStateOptions(){
      _.each(STATES, function(state){
        $('<option value="' + state + '">' + state + '</option>').appendTo(stateSelect);
      });
    }

    /// SUBMIT OBSERVABLE 
    // Input/Action
    function submitObservable(){
      return Rx.Observable.fromEvent(optionsSelectionsForm, 'submit')
              .map(function(ev){
                ev.preventDefault();
                var selection = {state: stateSelect.val(), industry: industrySelect.val()}
                return {data:selection, ev:ev, type:"form-submit"};
              });
    }
    //Sets up Text Input Observable 
    //Creates subscriptions 
    function init(){
      _renderStateOptions();
      // _renderIndustryOptions();
    }
    return {
              init:init,
              submitObservable: submitObservable
            };
  })();

  //STATE COMPARISON TABLE
  var comparisonTableComponent = (function(){
    function rowChangeObserver(cellSelector, formatFn){
      return Rx.Observer.create(
        function(res){
          cellSelector.empty();
          $('<td>'+ formatFn(res) +'</td>').appendTo(cellSelector);
        }
      );
    }
  })();

  var App = (function(){

    var lookup_table;
    //QUERIES
    var lookUpQueryObservable = soqlQueryAsObservable(DATASET_LIBRARY['lookup_table']),
        wagesQueryObservable = soqlQueryAsObservable(DATASET_LIBRARY['wages_by_industry']),
        educationQueryObservable = soqlQueryAsObservable(DATASET_LIBRARY['educational_attainment']);

    console.log("Hello from APP"); 

    function soqlQueryAsObservable(dataset_id){
      query = new SoQLQuery(dataset_id);
      var subject = new Rx.AsyncSubject();
      Rx.Observable.fromPromise(query).subscribe(subject);
      return subject;
    }

    function getIndustryClass(description){
      var industry = _.find(lookup_table, function(row){
        return row.description === description;
      });
      return industry.industry_classification;
    }

    function getLineCode(description){
      var industry = _.find(lookup_table, function(row){
        return row.description === description;
      });
      return industry.line_code;
    }


    //Load Lookup Table
    var lookUpSubject = soqlQueryAsyncSubject(lookUpQuery);
    InputComponent.init();
    var submitObservable = InputComponent.submitObservable();
    submitObservable.subscribe(function(data){
      console.log(data);
    });
  })();
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

var DATASET_LIB = {
  lookup_table: "e49i-f9fh",
  wages_by_industry: "4ini-sjpi"
};
var SoQLQuery = (function(){
  var DEFAULT_YEAR = 2013,
      BASE_URL = '/resource/';

var queryCache = {};

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
    return this;
  };

  //ALLOWS YOU TO SET QUERY DIRECTLY
  SoQLQuery.prototype.setQuery = function(options){
    this.query = options.query;
    console.log("SoQL query set to: ", this.query);
    return this;
  };

  //Returns promise observable
  SoQLQuery.prototype.fetchData = function(){
    var that = this;
    queryURL = that.url;
    if (that.query){ queryURL += that.query }
    return $.ajax({
      url: queryURL,
      dataType: 'json',
    })
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

SoQLRxUtil = (function(SQ){

  function queryAsObservable(query){
    var subject = new Rx.AsyncSubject();
    Rx.Observable.fromPromise(query.fetchData()).subscribe(subject);
    return subject;
  }

  function columnValuesAsObservable(query, columnName){
    var colQuery = query;
    colQuery.generateQuery({select:columnName, group: columnName});
    //returns observable
    return queryAsObservable(colQuery);
  }

  function observableFromDatasetId(dataset_id){
    return queryAsObservable(new SQ(dataset_id));
  }

  function getQueryCache(){
    return queryCache;
  }

  return {
          queryAsObservable: queryAsObservable,
          columnValuesAsObservable: columnValuesAsObservable,
          observableFromDatasetId: observableFromDatasetId,
          getQueryCache: getQueryCache
        };
})(SoQLQuery);

var InputComponent = (function(SQ, SQRx){


  var optionsSelectionsForm = $('#options-selection-form'),
      stateSelect = $('#state-input'),
      industrySelect = $('#industry-input'),
      industrySelected = false,
      occupationSelected = false,
      selectionMade = 0;

  function searchList(list, text){
    if (text){
      return _.filter(list, function(item){
        return !!item.toLowerCase().match(new RegExp("^" + text.toLowerCase()));
      });
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  // INDUSTRY SELECTION
  ////////////////////////////////////////////////////////////////////////////

  //Pull out industry list from the Look Up table and append them to the industry datalist
  function _renderIndustryOptions(){
    var query = new SQ(DATASET_LIB['lookup_table']);
    var industryOptions = SQRx.columnValuesAsObservable(query, 'description')
                            .selectMany(function(data){ return Rx.Observable.fromArray(data); })
                            .map(function(row){ return row.description; });
    industryOptions.subscribe(function(industry){
      $('<option value="' + industry + '">' + industry + '</option>').appendTo(industrySelect);
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
    _renderIndustryOptions();
  }
  return {
            init:init,
            submitObservable: submitObservable
          };
})(SoQLQuery, SoQLRxUtil);

//STATE COMPARISON TABLE
var comparisonTableComponent = (function(SQ, SQRx){
  function rowChangeObserver(cellSelector, formatFn){
    return Rx.Observer.create(
      function(res){
        cellSelector.empty();
        $('<td>'+ formatFn(res) +'</td>').appendTo(cellSelector);
      }
    );
  }
})(SoQLQuery, SoQLRxUtil);

var App = (function(SQ, SQRx){

  //QUERIES

  var lookUpObservable = SQRx.observableFromDatasetId(DATASET_LIB['lookup_table']);

  console.log("Hello from APP");

  function getIndustryClass(dataObject){
    return lookUpObservable
            .do(function(){console.log("getIndustryClass()")})
             //turns array of object result from lookUpTableQuery into stream of objects/rows
            .selectMany(function(row){
              return row
            })
            .find(function(row){
              return row.description === dataObject.data['industry'];
            })
            //Side-effect, adds line_code property to dataObject
            .do(function(row){ dataObject.data['industry_classification'] = row.industry_classification; })
             //returns dataObject with line_code property
            .map(function(industry){ 
              return dataObject 
            });
  }

  function getLineCode(dataObject){
    return lookUpObservable
            .do(function(){console.log("getLineCode()")})
            //turns array of object result from lookUpTableQuery into stream of objects/rows
            .selectMany(function(row){
              return row
            })
            .find(function(row){
              return row.description === dataObject.data['industry'];
            })
            //Side-effect, adds line_code property to dataObject
            .do(function(row){ dataObject.data['line_code'] = row.line_code; })
            //returns dataObject with line_code property
            .map(function(industry){
              return dataObject;
            });
  }


  //LOAD STATE/INDUSTRY FORM
  InputComponent.init();
  var resultQueryObservable = Rx.Observable.empty();
  var submitObservable = InputComponent.submitObservable();

  //Takes form submission, makes query and return industry classification code
  var industryClassObservable = submitObservable
    .flatMapLatest(getIndustryClass)
    .do(function(d){console.log("industry classification: ", d)});

  //Same as industryClassObservable but returns the line code
  var lineCodeObservable = submitObservable
    .flatMapLatest(getLineCode)
    .do(function(d){console.log("line code: ", d)});

  // var wagesByIndustryObservable = lineCodeObservable
  //   .flatMapLatest();
  industryClassObservable.subscribe(function(d){
    console.log(d);
  });

  lineCodeObservable.subscribe(function(d){
    console.log(d);
  });

})(SoQLQuery, SoQLRxUtil);
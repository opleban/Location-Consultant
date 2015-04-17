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
var counter = 0;
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
  economic_data_by_industry: "gqnx-8jnj"
};
var SoQLQuery = (function(){
  var BASE_URL = '/resource/';

var queryCache = {};

  function SoQLQuery(dataset_id, options){
    if (dataset_id){
      this.url = BASE_URL + dataset_id + '.json?';
    } else {
      throw "No dataset ID provided!";
    }
    if (options){
      this.generateQuery(options);
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
    }).promise();
  };

  //TODO: REFACTOR TO ALLOW GREATER CUSTOMIZATION
  function _generateWhereStatement(whereOption){
    var whereStatement = [];
    console.log(whereOption);
    _.map(whereOption, function(value, key){
      whereStatement.push(key + " = '" + value + "'");
    });
    return whereStatement.join(" AND ");
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
    return queryAsObservable(colQuery);
  }

  function observableFromDatasetId(dataset_id){
    return queryAsObservable(new SQ(dataset_id));
  }

  return {
          queryAsObservable: queryAsObservable,
          columnValuesAsObservable: columnValuesAsObservable,
          observableFromDatasetId: observableFromDatasetId
        };

})(SoQLQuery);

/* * * * * * * * * * * * * * * * *

INPUT VIEW COMPONENT

* * * * * * * * * * * * * * * * */

var InputComponent = (function(SQ, SQRx){
  var DEFAULT_YEAR = 2013,
      optionsSelectionsForm = $('#options-selection-form'),
      stateOneSelect = $('#state-one-input'),
      stateTwoSelect = $('#state-two-input')
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
  function renderIndustryOption(industryObj){
    $('<option value="' + industryObj.industry_classification + '">' + industryObj.description + '</option>').appendTo(industrySelect);
  }

  function _renderStateOptions(){
    _.each(STATES, function(state){
      $('<option value="' + state + '">' + state + '</option>').appendTo(stateOneSelect);
      $('<option value="' + state + '">' + state + '</option>').appendTo(stateTwoSelect);
    });
  }

  /// SUBMIT OBSERVABLE
  // Input/Action
  function submitObservable(){
    return Rx.Observable.fromEvent(optionsSelectionsForm, 'submit')
            .map(function(ev){
              ev.preventDefault();
              //HACKY, NEED TO REFACTOR TO HAVE THIS LOGIC TAKE PLACE IN SoQLQuery.prototype._generateWhereStatement()
              return { geoname: stateOneSelect.val() + ' OR ' + stateTwoSelect.val(), industry_classification: industrySelect.val(), year: DEFAULT_YEAR, _ev:ev, _type:"form-submit"};
            });
  }
  //Sets up Text Input Observable
  //Creates subscriptions
  function init(){
    _renderStateOptions();
  }
  return {
            init:init,
            renderIndustryOption: renderIndustryOption,
            submitObservable: submitObservable
          };
})(SoQLQuery, SoQLRxUtil);




/* * * * * * * * * * * * * * * * *

COMPARISON TABLE VIEW COMPONENT

* * * * * * * * * * * * * * * * */


var ComparisonTableComponent = (function(SQ, SQRx){
  var locationDict = {
    wages: $('.wages-salary')
  };
  
  function resultChangeObserver(locationKey, formatFn){
    return Rx.Observer.create(
      function(res){
        cellSelector.empty();
        if (formatFn){
          res = formatFn(res)
        }
        $('<td>'+ res +'</td>').appendTo(cellSelector);
      },
      function(err){
        cellSelector.empty();
        $('<td> - </td>').appendTo(cellSelector);
      }
    );
  }
  return { observer: resultChangeObserver}
})(SoQLQuery, SoQLRxUtil);

var ModelStore = (function(){
  var _states = [];

  function Result(options){
    this.name = options.name;
    this.industry_classification
    this.line_code
    this.compensation
    this.wages_and_salaries
    this.education_attainment
    this.employment
    this.wages
    this.raw_materials
    this.intermediate_materials
    this.final_materials
    this.natural_gas_prices
    this.electricity_prices
    this.oil_prices
    this.capital_outlay_for_highways
    this.highway_mileage
  }

  Result.prototype.setProperty = function(stat){};

})()

var MiscService = (function(){
  
  function filterObjectByProp(obj, whiteList){
    console.log(obj);
    var filteredObj = {};
    if (whiteList){
      _.each(obj, function(value, key){
        if (_.include(whiteList, key)){
          filteredObj[key] = value;
        }
      })
    }
    return filteredObj;
  }

  return {
    filterObjectByProp: filterObjectByProp
  };

})();
var LookUpService = (function(SQ, SQRx){
  var _lookUpObservable = SQRx.observableFromDatasetId(DATASET_LIB['lookup_table']);

  function getIndustryOptions(){
    return _lookUpObservable
            .do(function(){ console.log("get industry options"); })
            .selectMany(function(row){ return row; })
            .map(function(row){ 
              return { description:row.description, industry_classification:row.industry_classification, line_code:row.line_code }; 
            });
  }

  return {
            getIndustryOptions: getIndustryOptions
          };

})(SoQLQuery, SoQLRxUtil);



var App = (function(SQ, SQRx, LookUpService, MiscService){

  console.log("Hello from APP");
  // Observable with industry options

  //LOAD STATE/INDUSTRY FORM
  /********************************

  DATASET QUERIES

  ********************************/
  var submitObservable = InputComponent.submitObservable();

  var industryOptionsObservable = LookUpService.getIndustryOptions();

  // // gets industry classification code from form submission
  // var industryClassObservable = submitObservable
  //   .flatMapLatest(LookUpService.addIndustryClass)
  //   .do(function(d){console.log("industry classification: ", d) });

  // //gets line code from form submission
  // var lineCodeObservable = submitObservable
  //   .flatMapLatest(LookUpService.addLineCode)
  //   .do(function(d){console.log("line code: ", d) });
  
  //ATTEMPT TO DRY UP CODE
  //CONVOLUTED FUNCTION
  function generateSourceObservableFromDatasetId(dataset_id, whiteList){
    //creates SoQL Query
    var query = new SQ(dataset_id);
    return submitObservable
            .select(function(d){ 
              var whereStatement = MiscService.filterObjectByProp(d, whiteList)
              return query.generateQuery({ where:whereStatement }); 
            })
            .flatMapLatest(SQRx.queryAsObservable);
  }

  var whiteList = ['year', 'geoname', 'industry_classification'];
  var economicDataSource = generateSourceObservableFromDatasetId( DATASET_LIB['economic_data_by_industry'], whiteList);

  var wagesSource = economicDataSource;

  var compensationSource = economicDataSource;

  // var wagesQuery = new SQ(DATASET_LIB['wages_by_industry'])
  // var wagesSource = lineCodeObservable
  //   .select(function(d){
  //     return MiscService.filterObjectByProp(d, ['year','state', 'line_code']);
  //   })
  //   .select(function(d){ return wagesQuery.generateQuery({where:d}); })
  //   .flatMapLatest(SQRx.queryAsObservable);

  // var compensationQuery = new SQ(DATASET_LIB(['compensation_by_industry']);
  // var compensationSource = lineCodeObservable
  //   .select(function(d){
  //     return MiscService.filterObjectByProp(d, ['year','state', 'line_code']);
  //   })
  //   .select(function(d){ return wagesQuery.generateQuery({where: d}); })
  //   flatMapLatest(SQRx.queryAsObservable);


  // var zippedQueriesSources = Rx.Observable.zip(wagesSource, compensationSource, function(wages, compensation){
  //   return {wages: wages, compensation: compensation}
  // });

  /********************************
    
  SUBSCRIPTIONS/SIDE-EFFECTS

  ********************************/


  InputComponent.init();
  industryOptionsObservable.subscribe(function(d){
    InputComponent.renderIndustryOption(d);
  });

  economicDataSource.subscribe(
    function(d){
      console.log(d);
    },
    function(err){
      console.log(err);
    }
  );


})(SoQLQuery, SoQLRxUtil, LookUpService, MiscService);
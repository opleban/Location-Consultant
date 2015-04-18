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
  };

  //ALLOWS YOU TO CONSTRUCT A QUERY
  SoQLQuery.prototype.generateQuery = function(options){
    var query = [];
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

  //Returns promise or cached promise
  //Caching strategy inspired by: http://gosukiwi.svbtle.com/the-right-way-of-caching-ajax-requests-with-jquery
  SoQLQuery.prototype.fetchData = function(){
    var that = this;
    var queryURL = that.query ? that.url + that.query : that.url;
    if (!queryCache[queryURL]){
      queryCache[queryURL] = $.getJSON(queryURL).promise();
    }
    return queryCache[queryURL];
  };

  //TODO: REFACTOR TO ALLOW GREATER CUSTOMIZATION
  function _generateWhereStatement(whereOptionsArray){
    console.log(whereOptionsArray);
    var options = {};
    _.each(whereOptionsArray, function(opt){
      if (options[opt.column]){
        options[opt.column].push(opt.value);
      } else {
        options[opt.column] = [opt.value];
      }
    });
    var whereStatement = _.map(options, function(value, column){
      var statement = [];
      _.each(value, function(item){
        statement.push(column + " = '" + item + "'");
      })
      return statement.join(' OR ');
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

  function selectors() {
    return {
      $optionsSelectionForm: $('#options-selection-form'),
      $stateOneSelect: $('#state-one-input'),
      $stateTwoSelect: $('#state-two-input'),
      $industrySelect: $('#industry-input'),
      selectedIndustryText: function(){
        return $('#industry-input option:selected').text();
      }
    };
  }

  function _renderStateOptions(){
    _.each(STATES, function(state){
      $('<option value="' + state + '">' + state + '</option>').appendTo(selectors.$stateOneSelect);
      $('<option value="' + state + '">' + state + '</option>').appendTo(selectors.$stateTwoSelect);
    });
  }

  function renderIndustryOption(industryObj){
    $('<option value="' + industryObj.industry_classification + '">' + industryObj.description + '</option>').appendTo(selectors.$industrySelect);
  }

  function init(){
    _renderStateOptions();
  }
  return {
            init:init,
            renderIndustryOption: renderIndustryOption,
            selectors: selectors
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
  return { 
            observer: resultChangeObserver
          };
})(SoQLQuery, SoQLRxUtil);

var StateIndustryOccupation = (function(){

  function StateIndustryOccupation(options){
    this.state = options.state;
    this.industry = options.industryName;
    //this.occupation = options.occupation;
  };

  //ASSUMING THAT EACH TABLE HAS A DIFFERENT SCHEMA
  //FUTURE WORK COULD TRY TO MAKE TABLE SCHEMAS SIMILAR
  //COULD GREATLY SIMPLIFY THIS PROCESS
  StateIndustryOccupation.prototype.setProperty = function(propName, propObj){
    console.log("set property for ", this.state, propName, propObj)
    this[propName] = propObj;
    console.log("Set Property Result: ", this)
  };

  return StateIndustryOccupation;

})();

//ACCEPTS FORM SUBMIT DATA AND OUTPUTS DATA READY TO BE INGESTED 
//BY DATASTORE FUNCTION
var DataProcessService = (function(){
    var _propMethods = {
                      'Compensation by Industry': _processCompensationData,
                      'Wages and Salaries By Industry': _processWagesSalaryData
                    };

  //Happens right after initial form submission, creates State objects with options chosen in the form
  function processFormData(formData){
      var _propMethods = {
                      'Compensation by Industry': _processCompensationData,
                      'Wages and Salaries By Industry': _processWagesSalaryData
                    };

    if (formData['stateOne'] && formData['stateTwo']){
      var stateOne = formData['stateOne'];
      var stateTwo = formData['stateTwo'];
      stateOneData = { 
                          state: stateOne, 
                          industryName: formData['industryName'], 
                          // occupation: formData['occupation'],
                          year: formData['year'] 
                        };
      stateTwoData = { 
                          state: stateTwo, 
                          industryName: formData['industryName'], 
                          // occupation: formData['occupation'],
                          year: formData['year'] 
                        };
      return [stateOneData, stateTwoData];
    } else {
      console.log("DataProcessService.processFormData ", formData);
      throw "Missing state data from Form Submission";
    }
  }

  function process(stateData){
    console.log("process", stateData);
    var formattedData = _.map(stateData, function(d){
      var propName = d.table_title;
      if (_propMethods[propName]) {
        var propPrepMethod = _propMethods[propName]
      } else{
        throw "No property method found for '" + prop + "'!"
      }
      return propPrepMethod(d); 
    });
    return formattedData;
  }

  function _processCompensationData(compensationData){
    var propObj = {}
    //indicates the unit of measurement
    propObj.state = compensationData.geoname;
    propObj.unit = "Thousands of Dollars";
    propObj.amount = compensationData['amount_in_thousands_of_dollars'];
    propObj.type = "money";
    propObj.table_title = compensationData.table_title;
    return propObj;
  }

  function _processWagesSalaryData(wagesData){
    var propObj = {}
    //indicates the unit of measurement
    propObj.state = wagesData.geoname;
    propObj.unit = "Thousands of Dollars";
    propObj.amount = wagesData['amount_in_thousands_of_dollars'];
    propObj.type = "money";
    propObj.table_title = wagesData.table_title;
    return propObj;
  }


  return {
          processFormData: processFormData,
          process: process
        }
})();

/* * * * * * * * * * * * * * * * * * * *

DataStore
Ingests incoming data, keeps internal model of data. 

Emits event when when changes are made to ComponentViews
All data formatting/preparation takes place in DataProcessService Module

* * * * * * * * * * * * * * * * * * * */

var DataStore = (function(StateIndustryOccupation){
  var _states = {};

  function ingestFormData(dataArray){
    _.each(dataArray, function(stateData){
      var stateName = stateData.state;
      _states[stateName] = new StateIndustryOccupation(stateData);
    });
    console.log('DataStore.intakeFormData: State data intake: ', _states);
  }

  ///TODO REFACTOR AND PULL OUT TO EXTERNAL SERVICE MODULE
  function ingestQueryResults(formattedData){
      _.each(formattedData, function(d){
        if (_states[d.state]){
          _states[d.state].setProperty(d.table_title, d);
        } else {
          throw "Data returned for unselected state: '" + state + "'!"
        }
      });
  }

  return {
    ingestFormData: ingestFormData,
    ingestQueryResults: ingestQueryResults
  };

})(StateIndustryOccupation);


var LookUpService = (function(SQ, SQRx){
  var _lookUpObservable = SQRx.observableFromDatasetId(DATASET_LIB['lookup_table']);

  function getIndustryOptions(){
    return _lookUpObservable
            .do(function(){ console.log("get industry options"); })
            .selectMany(function(row){ return row; })
            .map(function(row){ 
              return {description:row.description, industry_classification:row.industry_classification, line_code:row.line_code }; 
            });
  }

  return {
            getIndustryOptions: getIndustryOptions
          };

})(SoQLQuery, SoQLRxUtil);


var MiscService = (function(){

  function searchList(list, text){
    if (text){
      return _.filter(list, function(item){
        return !!item.toLowerCase().match(new RegExp("^" + text.toLowerCase()));
      });
    }
  }
  
  function filterOptionsArray(optionsArray, whiteList){
    var filteredOptions = [];
    if (whiteList){
      _.each(optionsArray, function(obj){
        if (_.include(whiteList, obj['column'])){
          filteredOptions.push(obj);
        }
      });
    }
    return filteredOptions;
  }

  function filterSourceOnState(observable, state){
    var obs = observable;
    if (state){
      obs.selectMany(function(d){
        return d
      })
        .where(function(d){ 
          return d.geoname === state; 
        });
    }
  }

  return {
    filterOptionsArray: filterOptionsArray,
    searchList: searchList
  };

})();

var App = (function(SQ, SQRx, LookUpService, MiscService, DataProcessService, InputComponent, DataStore){
  var DEFAULT_YEAR = 2013
  var selectors = InputComponent.selectors();
  console.log("Hello from APP");

  function submitClickObservable(){
    return Rx.Observable.fromEvent(selectors.$optionsSelectionForm, 'submit');
  }

  function generateformSubmitObservable(){
    var formSubmitObservable = submitClickObservable()
      .map(function(ev){
        ev.preventDefault();
        return {
                  stateOne: selectors.$stateOneSelect.val(), 
                  stateTwo: selectors.$stateTwoSelect.val(), 
                  industryName: selectors.selectedIndustryText(), 
                  industry_classification: selectors.$industrySelect.val(), 
                  year: DEFAULT_YEAR 
                };
      });
      debugger;
      //Ensures side effects won't happen multiple times with multiple subscriptions;
      return formSubmitObservable.share();
  }

  var formSubmitObservable = generateformSubmitObservable();
  var industryOptionsObservable = LookUpService.getIndustryOptions();
  
  //CONVOLUTED FUNCTION
  //ESSENTIAL, BUT NEED BETTER FUNCTION NAME INDICATING WHAT HAPPENS HERE
  function generateSourceObservableFromDatasetId(dataset_id, whiteList){
    var query = new SQ(dataset_id);
    return formSubmitObservable
            .select(function(d){
              return [
                        {column:'geoname', value: d['stateOne']}, 
                        {column:'geoname', value: d['stateTwo']}, 
                        {column: 'industry_classification', value: d['industry_classification']},
                        // {column: 'occupation', value: d['occupation']}, 
                        {column:'year', value:d['year']}
                      ];
            })
            .select(function(d){ 
              var whereStatement = MiscService.filterOptionsArray(d, whiteList);
              return query.generateQuery({ where:whereStatement }); 
            })
            .do(function(d){ console.log(d); })
            .flatMapLatest(SQRx.queryAsObservable);
  }

  var whiteList = ['year', 'geoname', 'industry_classification'];
  var economicDataSource = generateSourceObservableFromDatasetId( DATASET_LIB['economic_data_by_industry'], whiteList);
  // var zippedSource = Rx.Observable.zip(economicDataSource);
  

  // var zippedQueriesSources = Rx.Observable.zip(wagesSource, compensationSource, function(wages, compensation){
  //   return {wages: wages, compensation: compensation}
  // });

  /********************************
    
  SUBSCRIPTIONS/SIDE-EFFECTS

  ********************************/

  InputComponent.init();

  submitObservable.subscribe(
    function(ev){
      ev.preventDefault();
    }
  );

  industryOptionsObservable.subscribe(
    function(d){
      InputComponent.renderIndustryOption(d);
    },
    function(err){
      console.log('Error with Industry Options Observable: ', err);
    }
  );

  formSubmitObservable.subscribe(
    function(d){
      var formattedStateData = DataProcessService.processFormData(d);
      // formattedStateData is an array of states
      DataStore.ingestFormData(formattedStateData);
    }, 
    function(err){
      console.log('Error with form Submit Observable: ', err);
    }
  );

  economicDataSource.subscribe(
    function(d){
      var formattedData = DataProcessService.process(d)     
      DataStore.ingestQueryResults(formattedData);
    },
    function(err){
      console.log("Error with Economic Data Source: ", err);
    }
  );

})(SoQLQuery, SoQLRxUtil, LookUpService, MiscService, DataProcessService, InputComponent, DataStore);
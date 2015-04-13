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

INDUSTRIES = [
"Farm compensation",
"Nonfarm compensation",
"Private nonfarm compensation",
"Forestry, fishing, and related activities",
"Forestry and logging",
"Fishing, hunting, and trapping",
"Agriculture and forestry support activities",
"Mining",
"Oil and gas extraction",
"Mining (except oil and gas)",
"Support activities for mining",
"Utilities",
"Construction",
"Construction of buildings",
"Heavy and civil engineering construction",
"Specialty trade contractors",
"Manufacturing",
"Durable goods manufacturing",
"Wood product manufacturing",
"Nonmetallic mineral product manufacturing",
"Primary metal manufacturing",
"Fabricated metal product manufacturing",
"Machinery manufacturing",
"Computer and electronic product manufacturing",
"Electrical equipment and appliance manufacturing",
"Motor vehicles, bodies and trailers, and parts manufacturing",
"Other transportation equipment manufacturing",
"Furniture and related product manufacturing",
"Miscellaneous manufacturing",
"Nondurable goods manufacturing",
"Food manufacturing",
"Beverage and tobacco product manufacturing",
"Textile mills",
"Textile product mill",
"Apparel manufacturing",
"Leather and allied product manufacturing",
"Paper manufacturing",
"Printing and related support activities",
"Petroleum and coal products manufacturing",
"Chemical manufacturing",
"Plastics and rubber products manufacturing",
"Wholesale trade",
"Retail trade",
"Motor vehicle and parts dealers",
"Furniture and home furnishings stores",
"Electronics and appliance stores",
"Building material and garden supply stores",
"Food and beverage stores",
"Health and personal care stores",
"Gasoline stations",
"Clothing and clothing accessories stores",
"Sporting goods, hobby, book and music stores",
"General merchandise stores",
"Miscellaneous store retailers",
"Nonstore retailers",
"Transportation and warehousing",
"Air transportation",
"Rail transportation",
"Water transportation",
"Truck transportation",
"Transit and ground passenger transportation",
"Pipeline transportation",
"Scenic and sightseeing transportation",
"Support activities for transportation",
"Couriers and messengers",
"Warehousing and storage",
"Information",
"Publishing industries, except Internet",
"Motion picture and sound recording industries",
"Broadcasting, except Internet",
"Internet publishing and broadcasting",
"Telecommunications",
"Data processing, hosting, and related services",
"Other information services",
"Finance and insurance",
"Monetary authorities - central bank",
"Credit intermediation and related activities",
"Securities, commodity contracts, investments",
"Insurance carriers and related activities",
"Funds, trusts, and other financial vehicles",
"Real estate and rental and leasing,Real estate",
"Rental and leasing services",
"Lessors of nonfinancial intangible assets",
"Professional, scientific, and technical services",
"Management of companies and enterprises",
"Administrative and waste management services",
"Administrative and support services",
"Waste management and remediation services",
"Educational services",
"Health care and social assistance",
"Ambulatory health care services",
"Hospitals",
"Nursing and residential care facilities",
"Social assistance",
"Arts, entertainment, and recreation",
"Performing arts and spectator sports",
"Museums, historical sites, zoos, and parks",
"Amusement, gambling, and recreation",
"Accommodation and food services",
"Accommodation",
"Food services and drinking places",
"Other services, except public administration",
"Repair and maintenance",
"Personal and laundry services",
"Membership associations and organizations",
"Private households",
"Government and government enterprises",
"Federal, civilian",
"Military,State and local",
"State government",
"Local government"
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
    return whereStatement.join(' AND ');
  }

  function _generateOrderStatement(orderOption){
    return orderOption.column + " " + orderOption.direction;
  }

  return SoQLQuery;
})();

  var InputComponent = (function(){


    var optionsSelectionsForm = $('#options-selection-form'),
        stateOptions = $('#states'),
        stateInputText = $('#stateTextInput'),
        industryOptions = $('#industries'),
        industryInputText = $('#industryTextInput'),
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

    //Query LookUpTable
    function _lookUpTableObservable(){
      var lookUpRequestPromise = new SoQLQuery(DATASET_LIBRARY['lookup_table']).fetchData();
      return Rx.Observable.fromPromise(lookUpRequestPromise);
    }

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
        $('<option value="' + industry + '">' + industry).appendTo(industryOptions);
      })
    }

    function _renderStateOptions(){
      _.each(STATES, function(state){
        $('<option value="' + state + '">' + state + '</option>').appendTo(stateOptions);
      });
    }

    /// SUBMIT OBSERVABLE 
    // Input/Action
    function submitObservable(){
      return Rx.Observable.fromEvent(optionsSelectionsForm, 'submit')
              .do(function(ev){
                ev.preventDefault();
              })
              .map(function(ev){
                var selection = {state: stateInputText.val(), industry: industryInputText.val()}
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
  })();

  var App = (function(){


    //QUERIES
    var lookUpQuery = new SoQLQuery(DATASET_LIBRARY['lookup_table']),
        wagesQuery = new SoQLQuery(DATASET_LIBRARY['wages_by_industry']),
        compensationQuery,
        naturalGasQuery,
        capitalHighwayQuery,
        highwayMileageQuery;

    console.log("Hello from APP"); 

    //CREATE DATALISTS WITH STATES, INDUSTRIES, AND OCCUPATIONS 
    function queryOnSubmitObserver(dataset_id){
      var query = new SoQLQuery(dataset_id);
      return Rx.Observer.create(
        function(res){
          var querySource = Rx.Observable.fromPromise(query.fetchData(res.data));
          console.log(lookUpSource);
        },
        function(err){
          console.log(err);
        },
        function(){
          console.log("completed");
        }
      );
    }

    InputComponent.init();
    var submitObservable = InputComponent.submitObservable();
    submitObservable.publish(function(sharedSubmit){
      sharedSubmit.subscribe(queryOnSubmitObserver(DATASET_LIBRARY['lookup_table']));
    })
  })();
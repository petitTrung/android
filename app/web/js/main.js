//
// MARK: Place Class
//

var PlaceKeys = {
  TITLE : "placeTitle",
  DESCRIPTION : "placeDescription",
  TYPE : "placeType",
  POSITION : "placePosition",
  ZOOM : "placeZoom",
}

var CustomPlace = function (mapPlace, marker) {
  this.mapPlace = mapPlace;
  this.marker = marker;

  this.getPositionString = function () {
    var location = this.mapPlace.get(PlaceKeys.POSITION);
    return location.lat.toFixed(6) + ", " + location.lng.toFixed(6);
  }
}


//
// MARK: (Application / UI) Logic
//

angular.module('mapsApp', [])
.run(function($rootScope) {
  Parse.initialize("onN8KLiec9xRevRxwcc1ojQfYPYvtnDOf4w22x1R", "DoByqX8VDewBp4TrOguly3k967jLcZdiPevAskvy");
})
.factory('MapPlace', function () {
  var mapplace = Parse.Object.extend('MapPlace', {
    // Instance methods
  }, {
    // Class methods
  });

  // Title property
  Object.defineProperty(mapplace.prototype, PlaceKeys.TITLE, {
    get: function() {
      return this.get(PlaceKeys.TITLE);
    },
    set: function(value) {
      this.set(PlaceKeys.TITLE, value);
    }
  });
  // Description property
  Object.defineProperty(mapplace.prototype, PlaceKeys.DESCRIPTION, {
    get: function() {
      return this.get(PlaceKeys.DESCRIPTION);
    },
    set: function(value) {
      this.set(PlaceKeys.DESCRIPTION, value);
    }
  });

  return mapplace;
})
.factory('SharedData', function($rootScope){

  var sharedData = {}; // SharedData object

  sharedData.tmpMapMarker = null;

  // current map zoom
  sharedData.setCurrentZoom = function (zoom) {
    if (this.focusedMapPlace) {
      $rootScope.$broadcast('updateCurrentZoom', zoom);
    }
  }

  // manages editing map status
  sharedData.setEditingMap = function (editing) {
    this.editingMap = editing;
    $rootScope.$broadcast('updateEditingMap');
  }
  sharedData.isEditingMap = function () {
    return this.editingMap;
  }

  // current editing map place
  sharedData.setFocusedMapPlace = function (place) {
    this.focusedMapPlace = place;
    $rootScope.$broadcast('focusedMapPlaceUpdated', this.focusedMapPlace);
  }
  sharedData.updateViews = function () {
    $rootScope.$broadcast('focusedMapPlaceUpdated', this.focusedMapPlace);
  }
  sharedData.getFocusedMapPlace = function () {
    return this.focusedMapPlace;
  }

  // saved places
  var places = [];
  sharedData.addPlace = function (place) {
    places.push(place);
  }
  sharedData.removePlace = function (placeIndex) {
    if (placeIndex > -1) {
      places.splice(placeIndex, 1);
    }
  }
  sharedData.getPlaces = function () {
    return places;
  }
  sharedData.getPlaceAtPosition = function (placePosition) {
    var arrayPlace = _.first(_.filter(places, function (cmp_place) {
      return placePosition === cmp_place.marker.getPosition()
    }));
    return arrayPlace || this.focusedMapPlace;
  }

  return sharedData;
})
.controller('PlaceFormController', function ($scope, SharedData) {

  $scope.placeTypes = ["Room", "Lecture Hall / Auditorium", "Building", "Walkway", "Road"]

  $scope.$on('focusedMapPlaceUpdated', function(ev, customPlace) {
    _.defer(function(){$scope.$apply();});

    $scope.focusedMapPlace = customPlace == null ? null : customPlace.mapPlace;
  });

  $scope.$on('updateCurrentZoom', function (ev, zoom) {
    _.defer(function(){$scope.$apply();});

    // check if in zooms list then don't allow adding again
    if ($scope.focusedMapPlace.get(PlaceKeys.ZOOM).indexOf(zoom) > -1) {
      $scope.currentZoom = null;
    } else {
      $scope.currentZoom = zoom;
    }
  });

  $scope.onPlaceTypeSelected = function (place) {
    $scope.focusedMapPlace.set(PlaceKeys.TYPE, place);
  }

  $scope.addNewZoom = function (zoom) {
    $scope.focusedMapPlace.add(PlaceKeys.ZOOM, zoom);
    $scope.currentZoom = null
  }

  $scope.removeZoom = function (zoom) {
    console.log(zoom);
  }

  $scope.savePlace = function() {
    var placeToSave = SharedData.getFocusedMapPlace();
    if (SharedData.getPlaceAtPosition(placeToSave.marker.getPosition()).length == 0) {
      SharedData.addPlace(placeToSave);
    }
    placeToSave.mapPlace.save();
    resetForm();
  }

  function resetForm () {
    document.getElementById("place-title").value = "";
    document.getElementById("place-desc").value = "";
    SharedData.setFocusedMapPlace(null);
    SharedData.updateViews();
  }

})
.controller('MapController', function ($scope, SharedData, MapPlace) {

  $scope.map = new google.maps.Map(document.getElementById('map'), {
    center: {lat: 0, lng: 0},
    zoom: 3,
    streetViewControl: false,
    mapTypeControlOptions: {
      mapTypeIds: [MAP_ID]
    }
  });

  // add base map
  $scope.map.mapTypes.set(MAP_ID, new google.maps.ImageMapType({
    getTileUrl: function (coord, zoom) {
      var normalizedCoord = MercatorProjection.getNormalizedCoord(coord, zoom);
      if (!normalizedCoord) return null;
      return "http://gurinderhans.me/sfumaps-web/assets/maptiles/basemap/" + zoom
            + "/" + normalizedCoord.x
            + "/" + normalizedCoord.y
            + ".png";
    },

    tileSize: new google.maps.Size(TILE_SIZE, TILE_SIZE),
    maxZoom: 6,
    minZoom: 1,
    name: MAP_ID,
  }));
  $scope.map.setMapTypeId(MAP_ID);

  // add overlay for the buildings
  $scope.map.overlayMapTypes.push(new google.maps.ImageMapType({
    getTileUrl: function (coord, zoom) {
      var normalizedCoord = MercatorProjection.getNormalizedCoord(coord, zoom);
      if (!normalizedCoord) return null;
      return "http://gurinderhans.me/sfumaps-web/assets/maptiles/overlay/" + zoom
            + "/" + normalizedCoord.x
            + "/" + normalizedCoord.y
            + ".png";
    },
    tileSize: new google.maps.Size(TILE_SIZE, TILE_SIZE),
    maxZoom: 6,
    minZoom: 1,
    name: MAP_ID,
  }));

  $scope.$on('updateEditingMap', function() {
    // toggle map UI
    $scope.map.setOptions({
      zoomControl: !SharedData.isEditingMap(),
      disableDoubleClickZoom: SharedData.isEditingMap(),
      disableDefaultUI: SharedData.isEditingMap(),
    });
  });


  //
  // MARK: Map Event Listeners
  //

  $scope.map.addListener('click', function (e) {
    if (!SharedData.isEditingMap()) {
      SharedData.tmpMapMarker = createMarker({
        position  : e.latLng,
        title     : "",
        icon      : "",
        draggable : true,
      }, markerClick, markerDragEnd);

      var mapPlace = new MapPlace(); // parse object
      mapPlace.set(PlaceKeys.ZOOM, [$scope.map.getZoom()]);

      var markerPos = SharedData.tmpMapMarker.getPosition()
      mapPlace.set(PlaceKeys.POSITION, {
        lat: markerPos.lat(),
        lng: markerPos.lng()
      });

      SharedData.setFocusedMapPlace(
        new CustomPlace(mapPlace, SharedData.tmpMapMarker));

      SharedData.setEditingMap(true);
    }
  });

  $scope.map.addListener('zoom_changed', function () {
    SharedData.setCurrentZoom($scope.map.getZoom());
  });


  // parse query the places for current zoom
  var placesQuery = new Parse.Query(MapPlace);
  placesQuery.containedIn(PlaceKeys.ZOOM, [$scope.map.getZoom()]) // get current zoom markers
  placesQuery.find({
    success: function(results) {
      for (var i = 0; i < results.length; i++) {
        var object = results[i];
        
        var placePosition = object.get(PlaceKeys.POSITION);
        SharedData.addPlace(new CustomPlace(object, createMarker({
                  position : new google.maps.LatLng(placePosition.lat, placePosition.lng),
                  title : object.get(PlaceKeys.TITLE),
                  draggable : true,
                }, markerClick, markerDragEnd)));
      }
    },
    error: function(error) {
      console.log(error)
    }
  });


  function markerClick(marker) {
    if (SharedData.tmpMapMarker) {
      SharedData.tmpMapMarker.setMap(null);
      SharedData.tmpMapMarker = null;
    }

    SharedData.setFocusedMapPlace(SharedData.getPlaceAtPosition(marker.latLng));
  }

  function markerDragEnd(marker) {
    SharedData.getFocusedMapPlace().mapPlace.set(PlaceKeys.POSITION,
    {
      lat: marker.latLng.lat(),
      lng: marker.latLng.lng(),
    })
    SharedData.updateViews();
  }

  // create marker
  function createMarker (markerInfo, cb_markerClick, cb_markerDragEnd) {
    var newMarker = new google.maps.Marker({
        position : markerInfo.position,
        map : $scope.map,
        icon: markerInfo.icon,
        title: markerInfo.title,
        draggable : markerInfo.draggable
    });

    if (cb_markerClick != null) {
      newMarker.addListener('click', cb_markerClick);
    }

    if (cb_markerDragEnd != null) {
      newMarker.addListener('dragend', cb_markerDragEnd);
    }

    return newMarker;
  }

});
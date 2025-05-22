    require([
      "esri/Map","esri/views/MapView",
      "esri/layers/GeoJSONLayer","esri/layers/FeatureLayer",
      "esri/widgets/Zoom","esri/widgets/BasemapGallery","esri/widgets/Expand",
      "esri/widgets/Editor","esri/widgets/FeatureTable"
    ], function(
      Map, MapView,
      GeoJSONLayer, FeatureLayer,
      Zoom, BasemapGallery, Expand,
      Editor, FeatureTable
    ) {
      const map = new Map({ basemap: "topo" });
      const view = new MapView({ container: "viewDiv", map, center:[90.8,27.5], zoom:9 });

      const bg = new BasemapGallery({ view });
      view.ui.add(new Expand({ view, content: bg, expanded: false, expandTooltip:"Change basemap" }), "top-left");

      // Load GeoJSON
      const gjLayer = new GeoJSONLayer({ url:"./Temples_Bhutan.geojson", outFields:["*"], popupTemplate:{ title:"{name}", content:"Religion: {religion}" }});
      map.add(gjLayer);

      let templeLayerView, densityLayerView;

      gjLayer.when(() => gjLayer.queryFeatures()).then(featureSet => {
        featureSet.features.forEach((g,i)=> g.attributes.ObjectID = i);

        const templeLayer = new FeatureLayer({
          id: "temples",
          title: "Temple",
          source: featureSet.features,
          fields: [
            { name:"ObjectID", type:"oid", alias:"ID" },
            { name:"name",     type:"string", alias:"Name" },
            { name:"religion", type:"string", alias:"Religion" }
          ],
          objectIdField:"ObjectID",
          geometryType:"point",
          spatialReference:{ wkid:4326 },
          renderer:{ type:"unique-value", field:"religion", defaultSymbol:{ type:"picture-marker",url:"./tgray.png",width:"30px",height:"30px" },
            uniqueValueInfos:[
              {value:"buddhist", symbol:{type:"picture-marker",url:"./torange.png",width:"30px",height:"30px"},label:"Buddhist"},
              {value:"hindu",    symbol:{type:"picture-marker",url:"./tred.png",   width:"30px",height:"30px"},label:"Hindu"},
              {value:"shinto",   symbol:{type:"picture-marker",url:"./tgreen.png", width:"30px",height:"30px"},label:"Shinto"},
              {value:"spiritualist",symbol:{type:"picture-marker",url:"./tblue.png",width:"30px",height:"30px"},label:"Spiritualist"}
            ]
          },
          popupTemplate: gjLayer.popupTemplate,
          visible:true
        });
        map.add(templeLayer);

        const densityLayer = new FeatureLayer({
          id: "density",
          title: "Density tile",
          source: featureSet.features,
          fields: templeLayer.fields,
          objectIdField:"ObjectID",
          geometryType:"point",
          spatialReference:{wkid:4326},
          renderer:{
            type:"heatmap",
            colorStops: [
                { ratio: 0,   color: "rgba(255, 200, 150, 0)" },
                { ratio: 0.2, color: "#FFC285" },
                { ratio: 0.4, color: "#FF9A66" }, 
                { ratio: 0.6, color: "#FF6B5E" },
                { ratio: 0.8, color: "#FF7087" }
            ],
            minPixelIntensity:0,
            maxPixelIntensity:50
          },
          popupTemplate: gjLayer.popupTemplate,
          visible:false
        });
        map.add(densityLayer);

        view.whenLayerView(templeLayer).then(lv=>templeLayerView=lv);
        view.whenLayerView(densityLayer).then(lv=>densityLayerView=lv);

        const lineLayer = new FeatureLayer({
          id:"paths",
          title: "Paths",
          source:[],
          fields:[
            {name:"ObjectID",type:"oid",alias:"ID"},
            {name:"name",    type:"string",alias:"Name"}
          ],
          objectIdField:"ObjectID",
          geometryType:"polyline",
          spatialReference:{wkid:4326},
          renderer:{type:"simple",symbol:{type:"simple-line",style:"dash",color:"red",width:2}},
          popupTemplate:{title:"{name}",content:"Path feature"}
        });

        const polygonLayer = new FeatureLayer({
          id:"areas",
          title: "Areas",
          source:[],
          fields:[
            {name:"ObjectID",type:"oid",alias:"ID"},
            {name:"name",    type:"string",alias:"Name"}
          ],
          objectIdField:"ObjectID",
          geometryType:"polygon",
          spatialReference:{wkid:4326},
          renderer:{type:"simple",symbol:{type:"simple-fill",color:[0,150,255,0.4],outline:{color:"blue",width:1}}},
          popupTemplate:{title:"{name}",content:"Area feature"}
        });

        map.addMany([lineLayer, polygonLayer]);

        const editor = new Editor({
          view,
          layerInfos:[
            {layer:templeLayer,    label:"Temples"},
            {layer:lineLayer,      label:"Paths"},
            {layer:polygonLayer,   label:"Areas"}
          ]
        });
        view.ui.add(editor,"top-right");

        const tableDiv = document.getElementById("tableDiv");
        view.ui.add(new Expand({
          view, content:tableDiv, expandIcon:"table", expanded:false, expandTooltip:"Show table"
        }), "bottom-left");
        new FeatureTable({ view, layer:templeLayer, container:tableDiv, editingEnabled:true });

        document.getElementById("religionFilter").addEventListener("change", e=>{
          const v=e.target.value;
          const f=v?{where:`religion='${v.replace(/'/g,"''")}'`}:null;
          templeLayerView.filter=f;
          densityLayerView.filter=f;
          gjLayer.visible = false;
        });

        document.getElementById("densityToggle").addEventListener("change", e=>{
          densityLayer.visible = e.target.checked;
          templeLayer.visible = !e.target.checked;
          gjLayer.visible = false;
        });
      });
    });
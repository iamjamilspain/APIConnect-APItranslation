// Paramater is a directory of files
require('colors')
yaml = require('js-yaml');
fs   = require('fs');
//Load each files
var FILENAME = 'lots.yaml'
newfile = './out/'+FILENAME;
file ='./Test/'+FILENAME;
var doc = yaml.safeLoad(fs.readFileSync(file, 'utf8'));

upgrade(doc['x-ibm-configuration'].assembly, function(file) {
  doc.info.version = doc.info.version+"_apigw"
  doc['x-ibm-configuration'].assembly = file;
  doc['x-ibm-configuration'].gateway = "datapower-api-gateway"
  // console.log(doc['x-ibm-configuration'].assembly)

  fs.writeFile(newfile,yaml.safeDump (doc, {
  'styles': {
    '!!null': 'canonical' // dump null as ~
  },
  'sortKeys': false        // sort object keys
}), function(err, data) {
    if (err) console.log(err);
    console.log("Successfully Written to File.");
  });

})

function upgrade(assembly,cb) {
  var path = ""
  if (assembly.execute) {
    path = 'execute'
  }
  else if (assembly.otherwise) {
    path = 'otherwise'
  }
  if ( assembly[path].length > 0) {
    for (var i = 0;  i < assembly[path].length ; i++) {
      upradeEntry(assembly[path][i],function(e) {
        if (Object.keys(e).length < 1) {
          console.log('Deleting')
          delete assembly[path][i]
        }
        else {
          console.log(path)
          console.log(assembly[path])
          console.log(assembly[path][i])
          assembly[path][i] = e;
        }
      })
      // console.log(assembly)
    }

    assembly[path] = assembly[path].filter(function (el) {
      return el != null;
    });


    cb(assembly);
  }
  else {
    upradeEntry(assembly,cb)
  }
}


function upradeEntry(assembly, cb) {

  var name = Object.keys(assembly)[0];
  assembly[name].version = "2.0.0"

  if (name == "activity-log") {
    log(file,"info",name,"Information Activity Log Found and removed")
    assembly = {}
  }
  else if (name == "operation-switch") {
    log(file,"warn",name,"WARNING Operation Switch Found")
    assembly['switch'] = assembly[name]
    delete assembly[name]
    name = 'switch';
    for (var j = 0 ; j < assembly[name].case.length ; j++) {

        if (assembly[name].case[j].operations) {
          var length = assembly[name].case[j].operations.length;
          assembly[name].case[j].condition = "";
          for (var op  = 0 ; op < length ; op++) {
            console.log(op)
            console.log(assembly[name].case[j].operations[op])
            operationDetails = assembly[name].case[j].operations[op]
            assembly[name].case[j].condition = assembly[name].case[j].condition+ " or ($httpVerb() = \""+operationDetails.verb.toUpperCase()+"\" and $operationPath() = \""+operationDetails.path+"\")"

        }
        assembly[name].case[j].condition = assembly[name].case[j].condition.replace(" or ","(") +")"
        delete assembly[name].case[j].operations
    }
  }

}

  else if (name == "switch") {
    log(file,"warn",name,"WARNING SWITCH Found")
    for (var j = 0 ; j < assembly[name].case.length ; j++) {
        if (assembly[name].case[j].operations) {
          assembly[name].case[j].operations.verb = "(" + assembly[name].case[j].condition + ")"
        }
    }
  }

  else if (name == "if") {
    log(file,"warn",name,"WARNING IF Found")

    assembly['switch'] = assembly[name]
    delete assembly[name]
    name = 'switch';

    assembly[name].case = []
    assembly[name].case[0] = {}
    assembly[name].case[0].condition = "(" + assembly[name].condition + ")"
    assembly[name].case[0].execute = assembly[name].execute

    delete assembly[name].execute
    delete assembly[name].condition

  }
  else if (name == "gatewayscript") {
    log(file,"warn",name,"WARNING Gateway Script Found")
    //is apim being used?
    if (assembly[name].source.indexOf(" apim.") > -1 ) {
      log(file,"warn",name,"apim is detected in GW Script, it is recommended that this is not used")
      if (assembly[name].source.indexOf(" apim = require") < 0 ) {
        log(file,"info",name,"Adding 'var apim = require(apim)' to allow the apim object to work.")
        assembly[name].source = "//Added by v5c to apigw translation script \n\n var apim = require(apim)\n\n//**\n\n"+assembly[name].source
      }
    }
  }
  else if (name == "xslt") {
    log(file,"warn",name,"WARNING xslt Found")
  }
  else if (name == "redact") {
    log(file,"warn",name,"WARNING".bold+" Redact Found - Removing Redact as not available in API Gateway")
    assembly = {}
  }
  else if (name == "proxy") {
    log(file,"warn",name,"WARNING".bold+" Proxy found and converted into Invoke")
    name = "invoke"
    assembly['invoke'] = assembly['proxy'];
    delete assembly['proxy']
  }
  else if (name == "validate-usernametoken") {
    log(file,"error",name,"ERROR".bold+" Validate-UsernameToken Found, This is not supported in the new API Gateway")
  }
  if (name == "invoke") {


    assembly['invoke']['header-control'] = {}
    assembly['invoke']['header-control'].type = 'blacklist'
    assembly['invoke']['header-control'].values = []
    assembly['invoke']['parameter-control'] = {}
    assembly['invoke']['parameter-control'].type = 'blacklist'
    assembly['invoke']['parameter-control'].values = []

  }
  if (assembly[name] && assembly[name].execute) {
    upgrade(assembly[name].execute, function(returned) {
      assembly[name].execute = returned;
      cb(assembly)
    })
  }
  else if (assembly[name] && assembly[name].case) {
    for (var i =0 ; i< assembly[name].case.length; i++ ) {


      upgrade(assembly[name].case[i], function(returned) {
        assembly[name].case[i] = returned;

      })
    }
    cb(assembly)
  }
  else
  {
    cb(assembly);
  }
}

function log(file,lvl,title,msg) {
  console.log(lvl)
  console[lvl]("["+file+"]["+lvl.bold+"]\t"+title.bold+" "+msg);
}

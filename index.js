// Paramater is a directory of files
require('colors')
yaml = require('js-yaml');
fs   = require('fs');
//Load each files
var FILENAME = 'ibm-poc-payment-plans_1.0.0.yaml'
newfile = './out/'+FILENAME;
file ='./v5yaml/'+FILENAME;
var doc = yaml.safeLoad(fs.readFileSync(file, 'utf8'));


upgrade(doc['x-ibm-configuration'].assembly, function(file) {
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
  console.log("Entering upgrade "+typeof assembly.execute.length)
  if ( assembly.execute.length > 0) {
    for ( var i =0 ; i < assembly.execute.length ; i++ ) {
      upradeEntry(assembly.execute[i],function(e) {
        assembly.execute[i] = e;
      })
    }
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
  }
  else if (name == "switch") {
    log(file,"warn",name,"WARNING SWITCH Found")
  }
  else if (name == "if") {
    log(file,"warn",name,"WARNING IF Found")
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
    log(file,"info",name,"Information Redact Found - Removing Redact as not available in API Gateway")
    assembly = {}
  }
  else if (name == "proxy") {
    log(file,"info",name,"Information Proxy found and converted into Invoke")
    name = "invoke"
  }
  else if (name == "validate-usernametoken") {
    log(file,"error",name,"ERROR".bold+" Validate-UsernameToken Found")
  }
  if (assembly[name].execute) {
    upgrade(assembly[name].execute, function(returned) {
      assembly[name].execute = returned;
      cb(assembly)
    })
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

#!/usr/bin/env node
'use strict'

const express = require('express')
const medUtils = require('openhim-mediator-utils')
const winston = require('winston')
const utils = require('./utils')
const bodyParser = require('body-parser');

// Logging setup
winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, {level: 'info', timestamp: true, colorize: true})

// Config
let config = {} // this will vary depending on whats set in openhim-core
const apiConf = process.env.NODE_ENV === 'test' ? require('../config/test') : require('../config/config')
const mediatorConfig = require('../config/mediator')

let port = process.env.NODE_ENV === 'test' ? 7001 : mediatorConfig.endpoints[0].port

/**
 * setupApp - configures the http server for this mediator
 *
 * @return {express.App}  the configured http server
 */
function setupApp () {
  const app = express()

  app.use(bodyParser.json())
  app.post('/order', async (req, res) => {
    winston.info("Processing " + req.method + " request on " + req.url)
    winston.info("Body posted: \n")
    console.log(req.body)

    var headers = { 'content-type': 'application/json' }

    let orchestrations = []
    let order_data, order_json, order_array
    try {
      let order_array = req.body
      //let order_array = await JSON.parse(order_data)
      
      
      //order_array = utils.toArray(order_json)

      let msh, pid, pv1, orc, obr

      msh = "MSH|^~\\&|DHIS|" + order_array[mediatorConfig.config.sendingfacility] + "|Polytech|" + order_array[mediatorConfig.config.receivinglaboratory]  +
            "|" + utils.adaptDateTime(order_array[mediatorConfig.config.messagedatetime])  + "||ORM^O01|0000|P|2.2"

      pid = "PID|1|" + order_array[mediatorConfig.config.externalpatientid] + "|" + 
            order_array[mediatorConfig.config.labassignedpatientid] + "||" + 
            (order_array[mediatorConfig.config.patientlastname] === undefined ? "NA" : order_array[mediatorConfig.config.patientlastname]) + 
            "^" + 
            (order_array[mediatorConfig.config.patientfirstname] === undefined ? "NA" : order_array[mediatorConfig.config.patientfirstname]) + 
            "^" + 
            (order_array[mediatorConfig.config.patientmiddlename] === undefined ? "" : 
              utils.nameInitial(order_array[mediatorConfig.config.patientmiddlename])) +
            "||" + 
            (order_array[mediatorConfig.config.patientdateofbirth] === undefined ? "NA" : 
              utils.adaptDate(order_array[mediatorConfig.config.patientdateofbirth])) + "|" + 
            (order_array[mediatorConfig.config.patientsex] === undefined ? "N" : utils.sexInitial(order_array[mediatorConfig.config.patientsex])) + 
            "|||" + 
            (order_array[mediatorConfig.config.patientaddress] === undefined ? "" : order_array[mediatorConfig.config.patientaddress]) + 
            "^" + 
            (order_array[mediatorConfig.config.patientcity] === undefined ? "" : order_array[mediatorConfig.config.patientcity]) + 
            "^" +
            (order_array[mediatorConfig.config.patientstate] === undefined ? "" : order_array[mediatorConfig.config.patientstate]) + 
            "^" +  
            (order_array[mediatorConfig.config.patientzip] === undefined ? "" : order_array[mediatorConfig.config.patientzip]) + 
            "||" + 
            (order_array[mediatorConfig.config.patientphone] === undefined ? "NA" : 
              utils.adaptPhone(order_array[mediatorConfig.config.patientphone]))

      pv1 = "PV1|" + 
            (order_array[mediatorConfig.config.sequencenumber] === undefined ? "" : order_array[mediatorConfig.config.sequencenumber]) + 
            "|||||" + 
            (order_array[mediatorConfig.config.priorlocation] === undefined ? "" : order_array[mediatorConfig.config.priorlocation]) + 
            "|" + 
            (order_array[mediatorConfig.config.physicianid] === undefined ? "NA" : order_array[mediatorConfig.config.physicianid]) + 
            "^" + 
            (order_array[mediatorConfig.config.physicianlastname] === undefined ? "NA" : order_array[mediatorConfig.config.physicianlastname])

      orc = "ORC|" + 
            utils.adaptOrderControl(order_array[mediatorConfig.config.ordercontrol]) + "|" + order_array[mediatorConfig.config.specimenid] + "|||||||" +
            utils.adaptDateTime(order_array[mediatorConfig.config.transactiondatetime]) + "|||" +
            (order_array[mediatorConfig.config.provideridno] === undefined ? "NA" : order_array[mediatorConfig.config.provideridno]) + 
            "^" +
            (order_array[mediatorConfig.config.providerlastname] === undefined ? "NA" : order_array[mediatorConfig.config.providerlastname]) + 
            "^" +
            (order_array[mediatorConfig.config.providerfirstnameinitial] === undefined ? "" : order_array[mediatorConfig.config.providerfirstnameinitial]) + 
            "^^^" +
            utils.adaptSourceTable(order_array[mediatorConfig.config.sourcetable])

      obr = "OBR|9999||" + 
            // (order_array[mediatorConfig.config.obrsequencenumber] === undefined ? "NA" : order_array[mediatorConfig.config.obrsequencenumber]) +
            // "||" +
            (order_array[mediatorConfig.config.labspecimennumber] === undefined ? "" : order_array[mediatorConfig.config.labspecimennumber]) +
            "|" + 
            (order_array[mediatorConfig.config.observationbatteryid] === undefined ? "NA" : order_array[mediatorConfig.config.observationbatteryid]) +
            "|" + 
            (order_array[mediatorConfig.config.observationbatterytext] === undefined ? "NA" : order_array[mediatorConfig.config.observationbatterytext]) +
            "|||" +
            (order_array[mediatorConfig.config.specimentcollectiondatetime] === undefined ? "" : 
              utils.adaptDateTime(order_array[mediatorConfig.config.specimentcollectiondatetime])) + "|||||||||" +
            (order_array[mediatorConfig.config.obrphysicianid] === undefined ? "NA" : order_array[mediatorConfig.config.obrphysicianid]) +
              "^" +
            (order_array[mediatorConfig.config.obrphysicianlastname] === undefined ? "NA" : order_array[mediatorConfig.config.obrphysicianlastname]) +
              "^" +
            (order_array[mediatorConfig.config.obrphysicianfirstnameinitial] === undefined ? "" : 
              order_array[mediatorConfig.config.obrphysicianfirstnameinitial]) + "^" +
            (order_array[mediatorConfig.config.obrphysicianmiddlenameinitial] === undefined ? "" : 
              order_array[mediatorConfig.config.obrphysicianmiddlenameinitial]) + "||||||" + 
            (order_array[mediatorConfig.config.observationreportdatetime] === undefined ? "NA" : 
              utils.adaptDateTime(order_array[mediatorConfig.config.observationreportdatetime])) + "|||F"
            

      winston.info("\n" + msh + "\n" + pid + "\n" + pv1 + "\n" + orc + "\n" + obr)
      res.send("\n" + msh + "\n" + pid + "\n" + pv1 + "\n"+ orc + "\n"  + obr)
      return
    } catch (err) {
      order_data = err.message
      // const headers = { 'content-type': 'application/text' }

      // // set content type header so that OpenHIM knows how to handle the response
      // res.set('Content-Type', 'application/json+openhim')

      // // construct return object
      // res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, order_data, 
      //             orchestrations, properties))
      winston.info(order_data)
      res.send(order_data)
      return
    }

})

app.post('/result', async (req, res) => {
  winston.info("Processing " + req.method + " request on " + req.url)
  winston.info("Body posted: \n")
  console.log(req.body)

  var headers = { 'content-type': 'application/json' }

  let orchestrations = []
  let order_data, indexes
  try {
    let order_array = req.body

    let msh = order_array['msh'], pid = order_array['pid'], pv1 = order_array['pv1'], obr = order_array['obr'], obx = order_array['obx']
    
    let msh_array = msh.split("|")
    indexes = utils.entryIndexes("msh")
    let result_msh = '"orgUnit": "' + msh_array[indexes.orgUnit] + '", "receiving_laboratory": "' + msh_array[indexes.receiving_laboratory] +
                      '", "created": "' + msh_array[indexes.created] + '"'
    
    let pid_array = pid.split("|")
    indexes = utils.entryIndexes("pid")
    let result_pid = '"suspect_id": "' + pid_array[indexes.suspect_id] + '", "name": "' + pid_array[indexes.name] + '", "date_of_birth": "' +
                      pid_array[indexes.date_of_birth] + '", "sex": "' + pid_array[indexes.sex] + '", "address": "' + pid_array[indexes.address] + 
                      '", "phone_local": "' + pid_array[indexes.phone_local] + '"'
    



    let result_string = '{' + result_msh + "," + result_pid + '}'

    
    
    console.log(JSON.parse(result_string))
    res.send(JSON.parse(result_string))
    return
  } catch (err) {
    order_data = err.message
    // const headers = { 'content-type': 'application/text' }

    // // set content type header so that OpenHIM knows how to handle the response
    // res.set('Content-Type', 'application/json+openhim')

    // // construct return object
    // res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, order_data, 
    //             orchestrations, properties))
    winston.info(order_data)
    res.send(order_data)
    return
  }``

})
return app
}

/**
 * start - starts the mediator
 *
 * @param  {Function} callback a node style callback that is called once the
 * server is started
 */
function start (callback) {
  if (apiConf.api.trustSelfSigned) { process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0' }

  if (apiConf.register) {
    medUtils.registerMediator(apiConf.api, mediatorConfig, (err) => {
      if (err) {
        winston.error('Failed to register this mediator, check your config')
        winston.error(err.stack)
        process.exit(1)
      }
      apiConf.api.urn = mediatorConfig.urn
      medUtils.fetchConfig(apiConf.api, (err, newConfig) => {
        winston.info('Received initial config:')
        winston.info(JSON.stringify(newConfig))
        config = newConfig
        if (err) {
          winston.error('Failed to fetch initial config')
          winston.error(err.stack)
          process.exit(1)
        } else {
          winston.info('Successfully registered mediator!')
          let app = setupApp()
          const server = app.listen(port, () => {
            if (apiConf.heartbeat) {
              let configEmitter = medUtils.activateHeartbeat(apiConf.api)
              configEmitter.on('config', (newConfig) => {
                winston.info('Received updated config:')
                winston.info(JSON.stringify(newConfig))
                // set new config for mediator
                config = newConfig

                // we can act on the new config received from the OpenHIM here
                winston.info(config)
              })
            }
            callback(server)
          })
        }
      })
    })
  } else {
    // default to config from mediator registration
    config = mediatorConfig.config
    let app = setupApp()
    const server = app.listen(port, () => callback(server))
  }
}
exports.start = start

if (!module.parent) {
  // if this script is run directly, start the server
  start(() => winston.info(`Listening on ${port}...`))

}

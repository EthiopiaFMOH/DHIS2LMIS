#!/usr/bin/env node
'use strict'
const mllp = require('../../mllp/index.js')
const express = require('express')
const medUtils = require('openhim-mediator-utils')
const winston = require('winston')
const utils = require('./utils')
const bodyParser = require('body-parser');
const fetch = require('node-fetch');

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
  var encodedDHIS2 = utils.doencodeDHIS2()
  const number_of_trials = 2
  
  app.post('/order', async (req, res) => {
    var mllp = require('../../mllp/index.js');

    winston.info("Processing " + req.method + " request on " + req.url)
    winston.info("Body posted: \n")
    console.log(req.body)

    var headers = { 'content-type': 'application/json' }

    let orchestrations = []
    let order_data, order_array, order, result = '', result_array = []
    try {
      order = req.body
      //Send the result
      var server = new mllp.MLLPServer('127.0.0.1', 4422)

      for(order_array of order) {
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
              "^" + 
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
                order_array[mediatorConfig.config.obrphysicianmiddlenameinitial]) + "||||||||" + 
              (order_array[mediatorConfig.config.observationreportdatetime] === undefined ? "NA" : 
                utils.adaptDateTime(order_array[mediatorConfig.config.observationreportdatetime])) + "|||F"
        result += (msh + "\r" + pid + "\r" + pv1 + "\r"+ orc + "\r"  + obr)

        let retry = 0, success = false
        while((retry < number_of_trials) && !success) {
          try{
            
            // Send outbound messages
            server.send('127.0.0.1', 4321, result, function (err, ackData) {
              
              // async callback code here
              console.log('err:', err)
              console.log('ackData:', ackData)
            })
            
          } catch(err) {
            winston.info(err.message)
          } 
          retry++
        }
        

        result_array.push(result)

      }

      let responseBody = JSON.stringify(result_array)
      // set content type header so that OpenHIM knows how to handle the response
      //res.set('Content-Type', 'application/json+openhim')

      // construct return object
      var properties = { property: 'Order Route' }
      res.send(utils.buildReturnObject(mediatorConfig.urn, "SUCCESS", 200, headers, responseBody, 
                                orchestrations, properties))
       

      winston.info(result_array)
      //res.send(result_array)
      return
    } catch (err) {
      order_data = err.message
      const headers = { 'content-type': 'application/text' }
      var properties = { 'property': 'Order Route' }
      // set content type header so that OpenHIM knows how to handle the response
      res.set('Content-Type', 'application/json+openhim')

      // construct return object
      res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, order_data, 
                  orchestrations, properties))
      winston.info(order_data)
      //res.send(order_data)
      return
    }

  })

  app.post('/result', async (req, res) => {
    var labTestResult = ''

    winston.info("Processing " + req.method + " request on " + req.url)
    winston.info("Body posted: \n")
    //console.log(req.headers)

    var headers = { 'content-type': 'application/json' }

    let orchestrations = []
    let order_data, indexes
    try {
      let order_array = req.body
      console.log(order_array)
      let msh = order_array.msh, pid = order_array.pid, pv1 = order_array.pv1, obr = order_array.obr, obx = order_array.obx
      
      let msh_array = msh.split("|")
      indexes = utils.entryIndexes("msh")
      let created = utils.formatDateTime(msh_array[indexes.created])
      let result_msh = '"orgUnit": "' + msh_array[indexes.orgUnit] + '", "receiving_laboratory": "' + msh_array[indexes.receiving_laboratory] +
                        '", "created": "' + created + '"'
      
      let pid_array = pid.split("|")
      indexes = utils.entryIndexes("pid")
      let name_array = pid_array[indexes.name].split("^")
      let address_array = pid_array[indexes.address].split("^")
      let date_of_birth = utils.formatDate(pid_array[indexes.date_of_birth])
      let phone = utils.formatPhone(pid_array[indexes.phone_local])
      let result_pid = '"suspect_id": "' + pid_array[indexes.suspect_id] + '", "last_name": "' + name_array[0] + '", "first_name": "' + 
                        name_array[1] + '", ' + ((name_array[2]) ? ('"middle_name": "' + name_array[2] + '", ') : '') + '"date_of_birth": "' +
                        date_of_birth + '", "sex": "' + pid_array[indexes.sex] + '", "address_woreda": "' + address_array[0] + 
                        '", "address_zone": "' + address_array[1] + '", "address_region": "' + address_array[2] + 
                        '", "phone_local": "' + phone + '"'
      
      let pv1_array = pv1.split("|")
      indexes = utils.entryIndexes("pv1")
      let physician_array = pv1_array[indexes.physician].split("^")
      let result_pv1 = '"requesting_physician": "' + physician_array[0] + '"'

      let obr_array = obr.split("|")
      indexes = utils.entryIndexes("obr")
      let observation_battery_array = obr_array[indexes.observation_battery].split("^")
      let speciment_datetime = utils.formatDateTime(obr_array[indexes.specimen_collection_time])
      let result_obr = '"specimen_id": "' + obr_array[indexes.specimen_id] + '", "type_of_test": "' + observation_battery_array[0] + 
                        '", "specimen_collection_time": "' + speciment_datetime + '"'

      let obx_array = obx.split("|")
      console.log(obx_array)
      indexes = utils.entryIndexes("obx")
      let result_time = utils.formatDateTime(obx_array[indexes.time_result_issued])
      let result_obx = '"test_result": "' + obx_array[indexes.test_result] + '", "time_result_issued": "' + result_time + '"'

      let result_string = '{' + result_msh + "," + result_pid + "," + result_pv1 + "," + result_obr + "," + result_obx + '}'
      let result_json = JSON.parse(result_string)
      
      console.log(result_json)

      ////////////////////////////////////////////////////////////////////////////////////
      ///////////////////////////Send result to DHIS2////////////////////////////////////
      ///////////////////////////////////////////////////////////////////////////////////
      try{
        insert_detail = await fetch(mediatorConfig.config.DHIS2baseurl + labTestResult, {
          method: "POST",
          headers: {
            "Authorization":"Basic " + encodedDHIS2,
            "Content-Type":"application/json"
          },
          body: JSON.stringify(result_json)

        })
        .then(response => response.json())
        .then(function handleData(data) {
          return_data = data;
        })
      } catch(err) {
        console.log("Sending Lab Test Result: " + err.message)
        const headers = { 'content-type': 'application/text' }

        // set content type header so that OpenHIM knows how to handle the response
        res.set('Content-Type', 'application/json+openhim')

        // construct return object
        res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, err.message, 
                    orchestrations, properties))
        return
      }
      var responseBody = JSON.stringify(result_json)
    
      // capture orchestration data
      var orchestrationResponse = { statusCode: 200, headers: headers }
      //let orchestrations = []
      orchestrations.push(utils.buildOrchestration('results', new Date().getTime(), req.method, 
                        req.url, req.headers, req.body, orchestrationResponse, responseBody))
      ///////////////////////////////////////////////////////////////////////////////////////////////////////
      // set content type header so that OpenHIM knows how to handle the response
      res.set('Content-Type', 'application/json+openhim')

      // construct return object
      var properties = { property: 'Result Route' }
      res.send(utils.buildReturnObject(mediatorConfig.urn, 'Successful', 200, headers, responseBody, 
                                  orchestrations, properties))

      console.log(result_json)
      //res.sendStatus(200)
      return
    } catch (err) {
      const headers = { 'content-type': 'application/text' }

      // set content type header so that OpenHIM knows how to handle the response
      res.set('Content-Type', 'application/json+openhim')

      // construct return object
      res.send(utils.buildReturnObject(mediatorConfig.urn, 'Failed', 404, headers, order_data, 
                  orchestrations, properties))
      return
    }
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

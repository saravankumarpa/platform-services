'use strict';
const {OpenShiftClientX, Util} = require('pipeline-cli')
const path = require('path');

module.exports = async (settings)=>{
  const phases = settings.phases
  const options= settings.options
  const phase=options.env
  const changeId = phases[phase].changeId
  const oc=new OpenShiftClientX(Object.assign({'namespace':phases[phase].namespace}, options));
  const templatesLocalBaseUrl =oc.toFileUrl(path.resolve(__dirname, '../../openshift'))
  var objects = []

  //Secrets for PGSQL/Patroni
  //First call will create/generate default values and a template
  oc.createIfMissing(oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/artifactory-pgsql-prereq.yaml`, {
    'param':{
      'NAME': `template.${phases[phase].name}-pgsql-patroni`,
      'SUFFIX': '',
      'APP_DB_USERNAME': 'artifactory',
      'APP_DB_NAME': 'artifactory'
    }
  }))

  //Second call will create the required object using their respective template (default ones generated above)
  objects = objects.concat(oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/artifactory-pgsql-prereq.yaml`, {
    'param':{
      'NAME': `${phases[phase].name}-pgsql`,
      'SUFFIX': phases[phase].suffix
    }
  }))


  //Deployment objects for Patroni
  objects = objects.concat(oc.processDeploymentTemplate(`${templatesLocalBaseUrl}/artifactory-pgsql.yaml`, {
    'param':{
      'NAME': `${phases[phase].name}-pgsql`,
      'SUFFIX': phases[phase].suffix
    }
  }))

  oc.applyRecommendedLabels(objects, phases[phase].name, phase, `${changeId}`, phases[phase].instance)
  
  oc.importImageStreams(objects, phases[phase].tag, phases.build.namespace, phases.build.tag)
  await oc.applyAndDeploy(objects, phases[phase].instance)

}
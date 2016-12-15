'use strict';

const updateStack = require('../src/aws/updateStack');

describe('updateStack', function() {
  let session,
      updateStackFn,
      routesJSON,
      waitForFn;

  beforeEach(function() {
    updateStackFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({});
    });

    waitForFn = spyWithPromise(function(resolve, reject) { // eslint-disable-line no-unused-vars
      resolve({});
    });

    routesJSON = {
      paths: {
        '/': {
          get: {
            'x-rise': {
              function: 'listTasks'
            }
          },
          put: {
            'x-rise': {
              function: 'createTasks'
            }
          }
        }
      }
    };

    const funcsJSON = {
      default: {
        memory: 128,
        timeout: 3
      },
      listTasks: {
        memory: 256
      },
      createTasks: {
        timeout: 2
      }
    };

    const compressedFunctionsJSON = [
      { functionName: 'listTasks' },
      { functionName: 'createTasks' }
    ];

    session = {
      stackName: 'my-test-stack',
      bucketName: 'my-test-bucket',
      region: 'my-test-region',
      version: 'v2',
      functions: funcsJSON,
      routes: routesJSON,
      compressedFunctions: compressedFunctionsJSON,
      aws: {
        cf: {
          updateStack: updateStackFn,
          waitFor: waitForFn
        },
        cfTemplate: {}
      }
    };
  });

  it('updates stack', function() {
    return updateStack(session, {})
      .then(function(session) {
        expect(session.state).to.equal('UPDATED');
        expect(updateStackFn).to.have.been.calledOnce;

        const p = updateStackFn.getCall(0).args[0];
        expect(p.StackName).to.equal('my-test-stack');
        expect(p.Capabilities).to.deep.equal(['CAPABILITY_IAM']);

        expect(waitForFn).to.have.been.calledOnce;
        expect(waitForFn).to.have.been.calledAfter(updateStackFn);
      });
  });

  it('updates stack with role', function() {
    return updateStack(session, {})
    .then(function(/* session */) {
      const p = updateStackFn.getCall(0).args[0],
            cfTemplate = JSON.parse(p.TemplateBody);

      const role = cfTemplate.Resources.RiseRole;
      expect(role).to.exist;
      expect(role.Properties.AssumeRolePolicyDocument.Statement).to.have.length(1);

      const roleStatement = role.Properties.AssumeRolePolicyDocument.Statement[0];
      expect(roleStatement.Principal.Service).to.deep.equal(["lambda.amazonaws.com"]);
      expect(roleStatement.Action).to.deep.equal(["sts:AssumeRole"]);

      const rolePolicy = cfTemplate.Resources.RiseRolePolicy;
      expect(rolePolicy).to.exist;
      expect(rolePolicy.Properties.PolicyDocument.Statement).to.have.length(1);
      expect(rolePolicy.Properties.Roles).to.deep.equal([{"Ref": "RiseRole"}]);

      const rolePolicyStatement = rolePolicy.Properties.PolicyDocument.Statement[0];
      expect(rolePolicyStatement.Action).to.deep.equal([
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]);
      expect(rolePolicyStatement.Resource).to.equal("arn:aws:logs:*:*:*");
    });
  });

  describe('routes', function() {
    it('updates stack with routes', function() {
      return updateStack(session, {})
      .then(function(/* session */) {
        const p = updateStackFn.getCall(0).args[0],
              cfTemplate = JSON.parse(p.TemplateBody);

        expect(cfTemplate.Resources.RiseAPIResourceGET).to.exist;
        const getMethod = cfTemplate.Resources.RiseAPIResourceGET;
        expect(getMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['RiseAPI', 'RootResourceId'] });

        expect(cfTemplate.Resources.RiseAPIResourcePUT).to.exist;
        const putMethod = cfTemplate.Resources.RiseAPIResourcePUT;
        expect(putMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['RiseAPI', 'RootResourceId'] });
      });
    });

    context('when cors option is set', function() {
      beforeEach(function() {
        routesJSON.paths['/']['get']['x-rise'].cors = true;
        session.routes = routesJSON;
      });

      it('adds "OPTIONS" route', function() {
        return updateStack(session, {})
          .then(function(/* session */) {
            const p = updateStackFn.getCall(0).args[0],
                  cfTemplate = JSON.parse(p.TemplateBody);

            expect(cfTemplate.Resources.RiseAPIResourceOPTIONS).to.exist;
            const optionsMethod = cfTemplate.Resources.RiseAPIResourceOPTIONS;
            expect(optionsMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['RiseAPI', 'RootResourceId'] });
            const responseParams = optionsMethod.Properties.Integration.IntegrationResponses[0].ResponseParameters;
            expect(responseParams["method.response.header.Access-Control-Allow-Methods"]).to.equal("'GET,OPTIONS'");
          });
      });
    });

    context('when default cors is true', function() {
      beforeEach(function() {
        routesJSON['x-rise'] = {
          default: {
            cors: true
          }
        };
        session.routes = routesJSON;
      });

      it('adds "OPTIONS" route for methods that does not specify cors option', function() {
        return updateStack(session, {})
          .then(function(/* session */) {
            const p = updateStackFn.getCall(0).args[0],
                  cfTemplate = JSON.parse(p.TemplateBody);

            expect(cfTemplate.Resources.RiseAPIResourceOPTIONS).to.exist;
            const optionsMethod = cfTemplate.Resources.RiseAPIResourceOPTIONS;
            expect(optionsMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['RiseAPI', 'RootResourceId'] });
            const responseParams = optionsMethod.Properties.Integration.IntegrationResponses[0].ResponseParameters;
            expect(responseParams["method.response.header.Access-Control-Allow-Methods"]).to.equal("'GET,PUT,OPTIONS'");
          });
      });

      context("when some cors options are false", function() {
        beforeEach(function() {
          routesJSON.paths['/']['get']['x-rise'].cors = false;
          session.routes = routesJSON;
        });

        it("excludes from options routes", function() {
          return updateStack(session, {})
            .then(function(/* session */) {
              const p = updateStackFn.getCall(0).args[0],
                    cfTemplate = JSON.parse(p.TemplateBody);

              expect(cfTemplate.Resources.RiseAPIResourceOPTIONS).to.exist;
              const optionsMethod = cfTemplate.Resources.RiseAPIResourceOPTIONS;
              expect(optionsMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['RiseAPI', 'RootResourceId'] });
              const responseParams = optionsMethod.Properties.Integration.IntegrationResponses[0].ResponseParameters;
              expect(responseParams["method.response.header.Access-Control-Allow-Methods"]).to.equal("'PUT,OPTIONS'");
            });
        });
      });
    });

    context('when there are nested routes', function() {
      beforeEach(function() {
        routesJSON.paths['/items'] = { get: { 'x-rise': { function: 'listTasks' } } };
        routesJSON.paths['/items/list'] = { get: { 'x-rise': { function: 'listTasks' } } };
        routesJSON.paths['/users/about'] = { get: { 'x-rise': { function: 'listTasks' } } };

        session.routes = routesJSON;
      });

      it("creates api resources and methods accordingly", function() {
        return updateStack(session, {})
          .then(function(/* session */) {
            const p = updateStackFn.getCall(0).args[0],
                  cfTemplate = JSON.parse(p.TemplateBody);

            // routes '/'
            expect(cfTemplate.Resources.RiseAPIResourceGET).to.exist;
            const getMethod = cfTemplate.Resources.RiseAPIResourceGET;
            expect(getMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['RiseAPI', 'RootResourceId'] });

            expect(cfTemplate.Resources.RiseAPIResourcePUT).to.exist;
            const putMethod = cfTemplate.Resources.RiseAPIResourcePUT;
            expect(putMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['RiseAPI', 'RootResourceId'] });

            // routes '/items'
            expect(cfTemplate.Resources.RiseAPIResourceItems).to.exist;
            const itemsRes = cfTemplate.Resources.RiseAPIResourceItems;
            expect(itemsRes.Properties.ParentId).to.deep.equal({ 'Fn::GetAtt': ['RiseAPI', 'RootResourceId'] });

            expect(cfTemplate.Resources.RiseAPIResourceItemsGET).to.exist;
            const getItemsMethod = cfTemplate.Resources.RiseAPIResourceItemsGET;
            expect(getItemsMethod.Properties.ResourceId).to.deep.equal({ Ref: 'RiseAPIResourceItems' });

            // routes '/items/list'
            expect(cfTemplate.Resources.RiseAPIResourceItemsList).to.exist;
            const itemsListRes = cfTemplate.Resources.RiseAPIResourceItemsList;
            expect(itemsListRes.Properties.ParentId).to.deep.equal({ Ref: 'RiseAPIResourceItems' });

            expect(cfTemplate.Resources.RiseAPIResourceItemsListGET).to.exist;
            const getItemsListMethod = cfTemplate.Resources.RiseAPIResourceItemsListGET;
            expect(getItemsListMethod.Properties.ResourceId).to.deep.equal({ Ref: 'RiseAPIResourceItemsList' });

            // routes '/users/about'
            expect(cfTemplate.Resources.RiseAPIResourceUsers).to.exist;
            const usersRes = cfTemplate.Resources.RiseAPIResourceUsers;
            expect(usersRes.Properties.ParentId).to.deep.equal({ 'Fn::GetAtt': ['RiseAPI', 'RootResourceId'] });

            expect(cfTemplate.Resources.RiseAPIResourceUsersAbout).to.exist;
            const usersAboutRes = cfTemplate.Resources.RiseAPIResourceUsersAbout;
            expect(usersAboutRes.Properties.ParentId).to.deep.equal({ 'Ref': 'RiseAPIResourceUsers' });

            expect(cfTemplate.Resources.RiseAPIResourceUsersAboutGET).to.exist;
            const getUsersAboutMethod = cfTemplate.Resources.RiseAPIResourceUsersAboutGET;
            expect(getUsersAboutMethod.Properties.ResourceId).to.deep.equal({ Ref: 'RiseAPIResourceUsersAbout' });
          });
      });
    });
  });
});

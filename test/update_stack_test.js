'use strict';

const updateStack = require('../src/aws/updateStack');

describe('updateStack', function() {
  let nfx,
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
            'x-nfx': {
              function: 'listTasks'
            }
          },
          put: {
            'x-nfx': {
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

    nfx = {
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

  it('updates stack', function(done) {
    updateStack(nfx, {})
      .then(function(nfx) {
        expect(nfx.state).to.equal('UPDATED');
        expect(updateStackFn).to.have.been.calledOnce;

        const p = updateStackFn.getCall(0).args[0];
        expect(p.StackName).to.equal('my-test-stack');
        expect(p.Capabilities).to.deep.equal(['CAPABILITY_IAM']);

        expect(waitForFn).to.have.been.calledOnce;
        expect(waitForFn).to.have.been.calledAfter(updateStackFn);
        done();
      })
      .catch(done);
  });

  it('updates stack with role', function(done) {
    updateStack(nfx, {})
    .then(function(/* nfx */) {
      const p = updateStackFn.getCall(0).args[0],
            cfTemplate = JSON.parse(p.TemplateBody);

      const role = cfTemplate.Resources.NFXRole;
      expect(role).to.exist;
      expect(role.Properties.AssumeRolePolicyDocument.Statement).to.have.length(1);

      const roleStatement = role.Properties.AssumeRolePolicyDocument.Statement[0];
      expect(roleStatement.Principal.Service).to.deep.equal(["lambda.amazonaws.com"]);
      expect(roleStatement.Action).to.deep.equal(["sts:AssumeRole"]);

      const rolePolicy = cfTemplate.Resources.NFXRolePolicy;
      expect(rolePolicy).to.exist;
      expect(rolePolicy.Properties.PolicyDocument.Statement).to.have.length(1);
      expect(rolePolicy.Properties.Roles).to.deep.equal([{"Ref": "NFXRole"}]);

      const rolePolicyStatement = rolePolicy.Properties.PolicyDocument.Statement[0];
      expect(rolePolicyStatement.Action).to.deep.equal([
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]);
      expect(rolePolicyStatement.Resource).to.equal("arn:aws:logs:*:*:*");
      done();
    })
    .catch(done);
  });

  describe('routes', function() {
    it('updates stack with routes', function(done) {
      updateStack(nfx, {})
      .then(function(/* nfx */) {
        const p = updateStackFn.getCall(0).args[0],
              cfTemplate = JSON.parse(p.TemplateBody);

        expect(cfTemplate.Resources.NFXApiResourceGET).to.exist;
        const getMethod = cfTemplate.Resources.NFXApiResourceGET;
        expect(getMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['NFXApi', 'RootResourceId'] });

        expect(cfTemplate.Resources.NFXApiResourcePUT).to.exist;
        const putMethod = cfTemplate.Resources.NFXApiResourcePUT;
        expect(putMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['NFXApi', 'RootResourceId'] });

        done();
      })
      .catch(done);
    });

    context('when cors option is set', function() {
      beforeEach(function() {
        routesJSON.paths['/']['get']['x-nfx'].cors = true;
        nfx.routes = routesJSON;
      });

      it('adds "OPTIONS" route', function(done) {
        updateStack(nfx, {})
          .then(function(/* nfx */) {
            const p = updateStackFn.getCall(0).args[0],
                  cfTemplate = JSON.parse(p.TemplateBody);

            expect(cfTemplate.Resources.NFXApiResourceOPTIONS).to.exist;
            const optionsMethod = cfTemplate.Resources.NFXApiResourceOPTIONS;
            expect(optionsMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['NFXApi', 'RootResourceId'] });
            const responseParams = optionsMethod.Properties.Integration.IntegrationResponses[0].ResponseParameters;
            expect(responseParams["method.response.header.Access-Control-Allow-Methods"]).to.equal("'GET,OPTIONS'");
            done();
          })
          .catch(done);
      });
    });

    context('when default cors is true', function() {
      beforeEach(function() {
        routesJSON['x-nfx'] = {
          default: {
            cors: true
          }
        };
        nfx.routes = routesJSON;
      });

      it('adds "OPTIONS" route for methods that does not specify cors option', function(done) {
        updateStack(nfx, {})
          .then(function(/* nfx */) {
            const p = updateStackFn.getCall(0).args[0],
                  cfTemplate = JSON.parse(p.TemplateBody);

            expect(cfTemplate.Resources.NFXApiResourceOPTIONS).to.exist;
            const optionsMethod = cfTemplate.Resources.NFXApiResourceOPTIONS;
            expect(optionsMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['NFXApi', 'RootResourceId'] });
            const responseParams = optionsMethod.Properties.Integration.IntegrationResponses[0].ResponseParameters;
            expect(responseParams["method.response.header.Access-Control-Allow-Methods"]).to.equal("'GET,PUT,OPTIONS'");
            done();
          })
          .catch(done);
      });

      context("when some cors options are false", function() {
        beforeEach(function() {
          routesJSON.paths['/']['get']['x-nfx'].cors = false;
          nfx.routes = routesJSON;
        });

        it("excludes from options routes", function(done) {
          updateStack(nfx, {})
            .then(function(/* nfx */) {
              const p = updateStackFn.getCall(0).args[0],
                    cfTemplate = JSON.parse(p.TemplateBody);

              expect(cfTemplate.Resources.NFXApiResourceOPTIONS).to.exist;
              const optionsMethod = cfTemplate.Resources.NFXApiResourceOPTIONS;
              expect(optionsMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['NFXApi', 'RootResourceId'] });
              const responseParams = optionsMethod.Properties.Integration.IntegrationResponses[0].ResponseParameters;
              expect(responseParams["method.response.header.Access-Control-Allow-Methods"]).to.equal("'PUT,OPTIONS'");
              done();
            })
            .catch(done);
        });
      });
    });

    context('when there are nested routes', function() {
      beforeEach(function() {
        routesJSON.paths['/items'] = { get: { 'x-nfx': { function: 'listTasks' } } };
        routesJSON.paths['/items/list'] = { get: { 'x-nfx': { function: 'listTasks' } } };
        routesJSON.paths['/users/about'] = { get: { 'x-nfx': { function: 'listTasks' } } };

        nfx.routes = routesJSON;
      });

      it("creates api resources and methods accordingly", function(done) {
        updateStack(nfx, {})
          .then(function(/* nfx */) {
            const p = updateStackFn.getCall(0).args[0],
                  cfTemplate = JSON.parse(p.TemplateBody);

            // routes '/'
            expect(cfTemplate.Resources.NFXApiResourceGET).to.exist;
            const getMethod = cfTemplate.Resources.NFXApiResourceGET;
            expect(getMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['NFXApi', 'RootResourceId'] });

            expect(cfTemplate.Resources.NFXApiResourcePUT).to.exist;
            const putMethod = cfTemplate.Resources.NFXApiResourcePUT;
            expect(putMethod.Properties.ResourceId).to.deep.equal({ 'Fn::GetAtt': ['NFXApi', 'RootResourceId'] });

            // routes '/items'
            expect(cfTemplate.Resources.NFXApiResourceItems).to.exist;
            const itemsRes = cfTemplate.Resources.NFXApiResourceItems;
            expect(itemsRes.Properties.ParentId).to.deep.equal({ 'Fn::GetAtt': ['NFXApi', 'RootResourceId'] });

            expect(cfTemplate.Resources.NFXApiResourceItemsGET).to.exist;
            const getItemsMethod = cfTemplate.Resources.NFXApiResourceItemsGET;
            expect(getItemsMethod.Properties.ResourceId).to.deep.equal({ Ref: 'NFXApiResourceItems' });

            // routes '/items/list'
            expect(cfTemplate.Resources.NFXApiResourceItemsList).to.exist;
            const itemsListRes = cfTemplate.Resources.NFXApiResourceItemsList;
            expect(itemsListRes.Properties.ParentId).to.deep.equal({ Ref: 'NFXApiResourceItems' });

            expect(cfTemplate.Resources.NFXApiResourceItemsListGET).to.exist;
            const getItemsListMethod = cfTemplate.Resources.NFXApiResourceItemsListGET;
            expect(getItemsListMethod.Properties.ResourceId).to.deep.equal({ Ref: 'NFXApiResourceItemsList' });

            // routes '/users/about'
            expect(cfTemplate.Resources.NFXApiResourceUsers).to.exist;
            const usersRes = cfTemplate.Resources.NFXApiResourceUsers;
            expect(usersRes.Properties.ParentId).to.deep.equal({ 'Fn::GetAtt': ['NFXApi', 'RootResourceId'] });

            expect(cfTemplate.Resources.NFXApiResourceUsersAbout).to.exist;
            const usersAboutRes = cfTemplate.Resources.NFXApiResourceUsersAbout;
            expect(usersAboutRes.Properties.ParentId).to.deep.equal({ 'Ref': 'NFXApiResourceUsers' });

            expect(cfTemplate.Resources.NFXApiResourceUsersAboutGET).to.exist;
            const getUsersAboutMethod = cfTemplate.Resources.NFXApiResourceUsersAboutGET;
            expect(getUsersAboutMethod.Properties.ResourceId).to.deep.equal({ Ref: 'NFXApiResourceUsersAbout' });

            done();
          })
          .catch(done);
      });
    });
  });
});

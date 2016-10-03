'use strict';

const chai = require('chai'),
      sinon = require('sinon'),
      sinonChai = require('sinon-chai');

root.expect = chai.expect;
root.sinon = sinon;

chai.use(sinonChai);

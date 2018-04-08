'use strict';

var Common = require('./common');

function StatusController(node) {
  this.node = node;
  this.common = new Common({log: this.node.log});
}

StatusController.prototype.show = function(req, res) {
  var self = this;
  var option = req.query.q;

  switch(option) {
  case 'getDifficulty':
    this.getDifficulty(function(err, result) {
      if (err) {
        return self.common.handleErrors(err, res);
      }
      res.jsonp(result);
    });
    break;
  case 'getLastBlockHash': 
    this.getLastBlockHash(function(err, result) {
      if (err) {
        return self.common.handleErrors(err, res);
      }
      res.jsonp(result);
    });
    
    break;
  case 'getBestBlockHash':
    this.getBestBlockHash(function(err, result) {
      if (err) {
        return self.common.handleErrors(err, res);
      }
      res.jsonp(result);
    });
    break;
  case 'getInfo':
  default:
    this.getInfo(function(err, result) {
      if (err) {
        return self.common.handleErrors(err, res);
      }
      res.jsonp({
        info: result
      });
    });
  }
};

StatusController.prototype.getInfo = function(callback) {
  this.node.services.bitcoind.getInfo(function(err, result) {
    if (err) {
      return callback(err);
    }
    var info = {
      version: result.version,
      protocolversion: result.protocolVersion,
      blocks: result.blocks,
      timeoffset: result.timeOffset,
      connections: result.connections,
      proxy: result.proxy,
      difficulty: result.difficulty,
      testnet: result.testnet,
      relayfee: result.relayFee,
      errors: result.errors,
      network: result.network
    };
    callback(null, info);
  });
};

StatusController.prototype.getLastBlockHash = function(callback) {
  var self = this;
  var hash = this.node.services.bitcoind.tiphash;
  
  this.node.services.bitcoind.getBlockHeader(hash, (err, res)=>{
    var result;
    if(res.height <= self.LimitHeight){
      result = {
        syncTipHash: hash,
        lastblockhash: hash
      };
      callback(null, result);
    }
    else{
      self.node.services.bitcoind._maybeGetBlockHash(self.LimitHeight, (err,res) => {
        result = {
        syncTipHash: res,
        lastblockhash: res
      };
      callback(null, result);
      });
    }

    
  });
  
};

StatusController.prototype.getBestBlockHash = function(callback) {
  var self = this;
  this.node.services.bitcoind.getBestBlockHash(function(err, hash) {
    if (err) {
      return callback(err);
    }

    self.node.services.bitcoind.getBlockHeader(hash, function (err, response) {
      if (response.height <= self.LimitHeight)
        callback(null, {
          bestblockhash: hash
        });

      else {
        self.node.services.bitcoind.getBlockHeader(self.LimitHeight, function (err, response) {
          callback(null, {
            bestblockhash: response.hash
          });
        });
      }
    });

  });
};

StatusController.prototype.getDifficulty = function(callback) {
  this.node.services.bitcoind.getInfo(function(err, info) {
    if (err) {
      return callback(err);
    }
    callback(null, {
      difficulty: info.difficulty
    });
  });
};

StatusController.prototype.sync = function(req, res) {
  var self = this;
  var status = 'syncing';

  this.node.services.bitcoind.isSynced(function(err, synced) {
    if (err) {
      return self.common.handleErrors(err, res);
    }
    /*
    if (synced) {
      status = 'finished';
    }
    */

    if (synced && self.node.services.bitcoind._height >= self.LimitHeight) {
      status = 'finished';
    }

    self.node.services.bitcoind.syncPercentage(function(err, percentage) {
      if (err) {
        return self.common.handleErrors(err, res);
      }
      var info = {
        status: status,
        blockChainHeight: self.node.services.bitcoind.height,
        //syncPercentage: Math.round(percentage),
        syncPercentage: self.node.services.bitcoind._height >= self.LimitHeight ? 100: Math.round(percentage),
        height: self.node.services.bitcoind.height,
        error: null,
        type: 'bitcore node'
      };

      res.jsonp(info);

    });

  });

};

// Hard coded to make insight ui happy, but not applicable
StatusController.prototype.peer = function(req, res) {
  res.jsonp({
    connected: true,
    host: '127.0.0.1',
    port: null
  });
};

StatusController.prototype.version = function(req, res) {
  var pjson = require('../package.json');
  res.jsonp({
    version: pjson.version
  });
};

module.exports = StatusController;

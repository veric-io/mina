import { Veri } from './Veri';

import {
  isReady,
  shutdown,
  Field,
  Mina,
  PrivateKey,
  AccountUpdate,
} from 'snarkyjs';

import axios from 'axios';

(async function main() {
  await isReady;

  console.log('SnarkyJS loaded');

  const Local = Mina.LocalBlockchain();
  Mina.setActiveInstance(Local);
  const deployerAccount = Local.testAccounts[0].privateKey;

  // ----------------------------------------------------

  // create a destination we will deploy the smart contract to
  const zkAppPrivateKey = PrivateKey.random();
  const zkAppAddress = zkAppPrivateKey.toPublicKey();

  // create an instance of Veri - and deploy it to zkAppAddress
  const zkAppInstance = new Veri(zkAppAddress);
  const deploy_txn = await Mina.transaction(deployerAccount, () => {
    AccountUpdate.fundNewAccount(deployerAccount);
    zkAppInstance.deploy({ zkappKey: zkAppPrivateKey });
    zkAppInstance.init();
    zkAppInstance.sign(zkAppPrivateKey);
  });
  await deploy_txn.send().wait();

  // get the initial state of Veri after deployment
  const receiverBalance0 = zkAppInstance.receiverBalance.get();
  console.log('state after init:', receiverBalance0.toString());

  const getAddressId = (address: string) => {
    switch(address) {
        case "0xa4bf3313fc02b10732e11ae8cbb07cb3ecde87cb":
            return 1
        default:
            return 0
    }
  }

  // ----------------------------------------------------
  // ZKP to prove NFT ownership
  let ownerAddress = ``
  const queryNFTOwner = async () => {
    const API_URL : string = "https://api.thegraph.com/subgraphs/name/protofire/opensea-wyvern-exchange-subgraph"
    const data = await axios.post(API_URL, {
      query: `query {
        nfts(where: {id: "nft-0x00000000000b7f8e8e8ad148f9d53303bfe20796-0xd"}) {
          owner {
            address
          }
        }
      }`
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      }).then(data => {
        console.log(`data: ${JSON.stringify(data)}`)
        if (data && data.data && data.data.data && data.data.data.nfts && data.data.data.nfts.length) {
          const nft = data.data.data.nfts[0]
          if (nft && nft.owner && nft.owner.address) {
            console.log(`nft owner address: ${nft.owner.address}`)
            ownerAddress = nft.owner.address
          } else {
            console.log(`nft owner address: empty`)
          }
        } else {
          console.log(`No nfts found`)
        }
      })
      .catch(error => console.log(`error: ${JSON.stringify(error)}`))
      .finally(() => {
        console.log(`complete query`)
      })

    console.log(`data: ${JSON.stringify(data)}`)
  }

  // ----------------------------------------------------
  // negative case:
  // NFT - nft-0x000001e1b2b5f9825f4d50bd4906aff2f298af4e-0x0
  // owner - 0x9d951c27e415a5c0f3e47b4492dda91a7737e636

  const txn1 = await Mina.transaction(deployerAccount, () => {
    zkAppInstance.update(new Field(getAddressId("0x9d951c27e415a5c0f3e47b4492dda91a7737e636")));
    zkAppInstance.sign(zkAppPrivateKey);
  });
  await txn1.send().wait();

  const ownStatus1 = zkAppInstance.ownTheNFT.get();
  console.log('state after txn1:', ownStatus1.toString());

  // ----------------------------------------------------
  // positive case:
  // NFT - nft-0x00000000000b7f8e8e8ad148f9d53303bfe20796-0xd
  // owner - 0xa4bf3313fc02b10732e11ae8cbb07cb3ecde87cb

  try {
    const txn2 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.update(new Field(getAddressId("0xa4bf3313fc02b10732e11ae8cbb07cb3ecde87cb")));
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn2.send().wait();
  } catch (ex: any) {
    console.log(ex.message);
  }
  const ownStatus2 = zkAppInstance.ownTheNFT.get();
  console.log('state after txn2:', ownStatus2.toString());

  // ----------------------------------------------------
  // positive case from query result
  await queryNFTOwner()
  try {
    const txn3 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.update(new Field(getAddressId(ownerAddress)));
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn3.send().wait();
  } catch (ex: any) {
    console.log(ex.message);
  }
  const ownStatus3 = zkAppInstance.ownTheNFT.get();
  console.log('state after txn3:', ownStatus3.toString());

  console.log('Shutting down');

  await shutdown();
})();

import {
    Field,
    SmartContract,
    state,
    State,
    method,
    DeployArgs,
    Permissions,
    Bool,
  } from 'snarkyjs';

  /**
   * Basic Example
   * See https://docs.minaprotocol.com/zkapps for more info.
   *
   * The Veri contract initializes the state variable 'receiverBalance' to be a Field(0) value by default when deployed.
   * When the 'update' method is called, the Add contract adds Field(2) to its 'receiverBalance' contract state.
   * 
   * This file is safe to delete and replace with your own contract.
   */
  export class Veri extends SmartContract {
    @state(Field) receiverBalance = State<Field>();
    @state(Bool) ownTheNFT = State<Bool>() 
    // ownAddress : String = "0xa4bf3313fc02b10732e11ae8cbb07cb3ecde87cb" // will get after connected with wallet
    ownAddress : Field = new Field(1)
  
    deploy(args: DeployArgs) {
      super.deploy(args);
      this.setPermissions({
        ...Permissions.default(),
        editState: Permissions.proofOrSignature(),
      });
    }
  
    @method init() {
      this.receiverBalance.set(Field(0));
      this.ownTheNFT.set(Bool(false))
    }
  
    @method update(address: Field) {
      const currentState = this.receiverBalance.get();
      this.receiverBalance.assertEquals(currentState); // precondition that links this.receiverBalance.get() to the actual on-chain state
      const currentOwnState = this.ownTheNFT.get();
      this.ownTheNFT.assertEquals(currentOwnState)

      const newState = currentState.add(2);
      newState.assertEquals(currentState.add(2));
      this.receiverBalance.set(newState);

      const newOwnState = new Bool(address === this.ownAddress)
      this.ownTheNFT.set(newOwnState)
    } 
  }
  
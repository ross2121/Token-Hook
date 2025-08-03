import  *  as  anchor  from  "@coral-xyz/anchor" ;
import  { Program }  from  "@coral-xyz/anchor" ;
import  { TransferHook }  from  "../target/types/transfer_hook" ;
import  {
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
}  from  "@solana/web3.js" ;
import  {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  getMintLen,
  createInitializeMintInstruction,
  createInitializeTransferHookInstruction,

  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  createApproveInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  createTransferCheckedWithTransferHookInstruction,
}  from  "@solana/spl-token" ;
import { min } from "bn.js";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";


 

 
describe("tranfer-hook",()=>{
  anchor.setProvider(anchor.AnchorProvider.env());
  const provider=anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.transferHook as Program<TransferHook>;
  const wallet=provider.wallet;
  const connection=provider.connection;
  const mint=new Keypair();
  const decimal=9;
  const sourceToken=getAssociatedTokenAddressSync(mint.publicKey,wallet.publicKey,false);
  const recipent=Keypair.generate();
  const destinationToken=getAssociatedTokenAddressSync(
    mint.publicKey,
    recipent.publicKey,false
  );
  const [extraaccount]=PublicKey.findProgramAddressSync([Buffer.from("extra-account-metas"),mint.publicKey.toBuffer()],program.programId);
  const [delegatePda]=PublicKey.findProgramAddressSync([Buffer.from("delegate")],program.programId)
  const senderwasoltokenaccount=getAssociatedTokenAddressSync(NATIVE_MINT,wallet.publicKey,false);
  const delegatewsoltokenacoint=getAssociatedTokenAddressSync(NATIVE_MINT,delegatePda,true);
  before(async()=>{
    await getOrCreateAssociatedTokenAccount(connection,wallet.payer,NATIVE_MINT,wallet.publicKey)
    await getOrCreateAssociatedTokenAccount(connection,wallet.payer,NATIVE_MINT,delegatePda,true);
  })
  it("create mint account",async()=>{
    const extensions=[ExtensionType.TransferHook];
    const minlen=getMintLen(extensions);
    const lamport=await provider.connection.getMinimumBalanceForRentExemption(minlen);
    const transaction=new Transaction().add(SystemProgram.createAccount({
      fromPubkey:wallet.publicKey,
      newAccountPubkey:mint.publicKey,
      space:minlen,
      lamports:lamport,
      programId:TOKEN_2022_PROGRAM_ID
    }),createInitializeTransferHookInstruction(mint.publicKey,wallet.publicKey,program.programId,TOKEN_2022_PROGRAM_ID),
  createInitializeMintInstruction(mint.publicKey,decimal,wallet.publicKey,null,TOKEN_2022_PROGRAM_ID)
  )
  const txsggi=await sendAndConfirmTransaction(provider.connection,transaction,[wallet.payer,mint])
    console.log(txsggi);
  })
  it("create token account and mint some token account",async()=>{
    const amount=100*10**decimal;
    const transaction=new Transaction().add(createAssociatedTokenAccountInstruction(wallet.publicKey,sourceToken,wallet.publicKey,mint.publicKey,TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID),createAssociatedTokenAccountInstruction(wallet.publicKey,destinationToken,
      recipent.publicKey,mint.publicKey,TOKEN_2022_PROGRAM_ID,ASSOCIATED_TOKEN_PROGRAM_ID
    ),createMintToInstruction(mint.publicKey,sourceToken,wallet.publicKey,amount,[],TOKEN_2022_PROGRAM_ID))
    const txsign=await sendAndConfirmTransaction(connection,transaction,[wallet.payer],{skipPreflight:true})
    console.log(txsign);
  })
  it("create ExtraAccontMeta",async()=>{
    const initialize=await program.methods.initializeExtraAccountMetaList().accountsStrict({
      payer:wallet.publicKey,
      extraAccountMetaList:extraaccount,
      mint:mint.publicKey,
      wsolMint:NATIVE_MINT,
      tokenProgram:TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram:ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram:SYSTEM_PROGRAM_ID
    }).instruction()
    const transaction=new Transaction().add(initialize);
    const txsign=await sendAndConfirmTransaction(provider.connection,transaction,[wallet.payer],{skipPreflight:true})
    console.log(txsign)
  })
  it("transfer hook with extra account meta",async()=>{
    const amount=1*10**decimal;
    const amountBig=BigInt(amount);
     const soltransferinstruction=SystemProgram.transfer({
      fromPubkey:wallet.publicKey,
      toPubkey:senderwasoltokenaccount,
      lamports:amount
     });
     const approveinstruction=createApproveInstruction(
      senderwasoltokenaccount,delegatePda,wallet.publicKey,amount,[],TOKEN_PROGRAM_ID
     );
     const syncwrappedSolInsrtuction=createSyncNativeInstruction(senderwasoltokenaccount)//his instruction is unique to Wrapped SOL (wSOL). When you send native SOL to a wSOL token account, the account's lamport balance increases, but its token amount does not. The token program doesn't know those lamports are supposed to be wSOL yet.
     let tranferinstructionwithhelper=await createTransferCheckedWithTransferHookInstruction(
      connection,sourceToken,mint.publicKey,destinationToken,wallet.publicKey,amountBig,decimal,[],"confirmed",TOKEN_2022_PROGRAM_ID
     )
     const transaction=new Transaction().add(soltransferinstruction,syncwrappedSolInsrtuction,approveinstruction,tranferinstructionwithhelper);
     const txsign=await sendAndConfirmTransaction(connection,transaction,[wallet.payer],{skipPreflight:true});
     console.log(txsign);
  })
})


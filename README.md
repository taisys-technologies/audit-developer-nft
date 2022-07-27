# audit-developer-nft

The contract is based from ERC721, but in order to saving gas fee, we choose to inherit ERC721A.\
Basically, contract is close to original ERC721, but we did some changes to fit requirements,\
the following are some explanation for the function or user scenario.

## Period
In DeveloperNFT contract,\
we restrict not only total NFT supply, but also every period NFT supply,\
and all the period supply sum up can not greater than the total NFT token supply.

The scenario will be the admin need to set up token supply of the period first,\
after selling all NFT in the period, the admin can set up token supply of the next period (function `setPeriodTokenSupply`),\
and the following selling will belong to the next period.

## checkTokenAndMint (function)
Only address on whitelisting can mint NFT, and this part we implement through EIP712.\
Every address need to call checkTokenAndMint function with arguments: uuid, userAddress, deadline, uri, and signature.
The signature will be signed by the address assigned by the contract admin, and that's `ERC721AStorageCustom.layout()._signerAddress`.\
In addition, we use uuid but not nonce,\
because if there are two addresses try to request token for mint NFT at the same time,\
one of the address must fail because they got the same nonce,\
and the failed executor may be confused about why would the signature be wrong.\
The signature is provided by `_signerAddress` and should be accurate.\
In order to optimize user experience, we choose to use uuid though it may cost much more contract storage.

## setMaxTokenSupply (function)
Offering this function for admin to modify the total NFT supply limit,
but only before the NFT haven't start to be sold.

## setPaymentContract (function)
The payment token for mint this NFT.

## setPrice (function)
To set up price for each NFT.

## withdraw (function)
When user mint address, the contract will get token.\
The admin can withdraw the token back or transfer to whoever he want.

## transferAdmin (function)
We add this function to achieve grant Admin and transfer at the same time.
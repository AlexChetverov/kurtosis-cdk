// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PrecompileWrapper {
    address constant SHA256_PRECOMPILE = 0x0000000000000000000000000000000000000002;

    function sha256ViaPrecompile(bytes memory input) public view returns (bytes32) {
        (bool success, bytes memory result) = SHA256_PRECOMPILE.staticcall(input);
        require(success, "Precompile call failed");

        return abi.decode(result, (bytes32));
    }
}
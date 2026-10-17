// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title Ledger
/// @notice Append-only evidence store for Blockwise. One record per (proposer, generation, index).
///
/// Invariants (see docs/principles.md):
///  - Only the bound Evaluator can write. Proposers cannot score themselves.
///  - Every record is write-once. Nothing is updated or deleted.
///  - `confirm` and `sealed` results are separate, write-once slots (few looks, one sealed look).
contract Ledger {
    error NotOwner();
    error NotEvaluator();
    error AlreadyBound();
    error AlreadyRecorded();
    error NotRecorded();

    address public immutable owner;
    address public evaluator;

    // Dev record layout (one storage slot, low bits first):
    //   [  0..159] proposer address
    //   [160..191] dev score, int32 two's-complement bits (basis points of PnL)
    //   [192..207] trades, uint16
    //   [208..215] operator id, uint8
    //   [216..255] first 40 bits of keccak256(abi.encode(params)), binds later looks to the same params
    mapping(bytes32 key => uint256) private _dev;

    // Later-look layout: bit 255 = set flag, [0..31] score (int32 bits), [32..47] trades.
    mapping(bytes32 key => uint256) private _confirm;
    mapping(bytes32 key => uint256) private _sealed;

    constructor() {
        owner = msg.sender;
    }

    /// @notice One-time binding of the Evaluator. After this the Ledger answers to nobody else.
    function bind(address evaluator_) external {
        if (msg.sender != owner) revert NotOwner();
        if (evaluator != address(0)) revert AlreadyBound();
        evaluator = evaluator_;
    }

    modifier onlyEvaluator() {
        if (msg.sender != evaluator) revert NotEvaluator();
        _;
    }

    // ---------------------------------------------------------------- writes

    function recordDev(
        bytes32 key,
        address proposer,
        int32 dev,
        uint16 trades,
        uint8 operator,
        uint40 paramsHash
    ) external onlyEvaluator {
        if (_dev[key] != 0) revert AlreadyRecorded();
        _dev[key] =
            uint256(uint160(proposer)) |
            (uint256(uint32(dev)) << 160) |
            (uint256(trades) << 192) |
            (uint256(operator) << 208) |
            (uint256(paramsHash) << 216);
    }

    function recordConfirm(bytes32 key, int32 score, uint16 trades) external onlyEvaluator {
        if (_dev[key] == 0) revert NotRecorded();
        if (_confirm[key] != 0) revert AlreadyRecorded();
        _confirm[key] = (1 << 255) | uint256(uint32(score)) | (uint256(trades) << 32);
    }

    function recordSealed(bytes32 key, int32 score, uint16 trades) external onlyEvaluator {
        if (_dev[key] == 0) revert NotRecorded();
        if (_sealed[key] != 0) revert AlreadyRecorded();
        _sealed[key] = (1 << 255) | uint256(uint32(score)) | (uint256(trades) << 32);
    }

    // ----------------------------------------------------------------- reads

    function keyOf(address proposer, uint32 gen, uint32 idx) public pure returns (bytes32) {
        return keccak256(abi.encode(proposer, gen, idx));
    }

    function exists(bytes32 key) external view returns (bool) {
        return _dev[key] != 0;
    }

    function getDev(bytes32 key)
        external
        view
        returns (address proposer, int32 dev, uint16 trades, uint8 operator, uint40 paramsHash, bool found)
    {
        uint256 w = _dev[key];
        found = w != 0;
        proposer = address(uint160(w));
        dev = int32(uint32(w >> 160));
        trades = uint16(w >> 192);
        operator = uint8(w >> 208);
        paramsHash = uint40(w >> 216);
    }

    function getConfirm(bytes32 key) external view returns (int32 score, uint16 trades, bool found) {
        uint256 w = _confirm[key];
        found = w != 0;
        score = int32(uint32(w));
        trades = uint16(w >> 32);
    }

    function getSealed(bytes32 key) external view returns (int32 score, uint16 trades, bool found) {
        uint256 w = _sealed[key];
        found = w != 0;
        score = int32(uint32(w));
        trades = uint16(w >> 32);
    }
}

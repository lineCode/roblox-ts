import * as lua from "LuaAST";
import * as tsst from "ts-simple-type";
import { TransformState } from "TSTransformer/TransformState";
import { binaryExpressionChain } from "TSTransformer/util/binaryExpressionChain";
import { pushToVarIfComplex } from "TSTransformer/util/pushToVar";
import ts from "typescript";

export function willWrapConditional(state: TransformState, nodeType: ts.Type) {
	const simpleType = tsst.toSimpleType(nodeType, state.typeChecker);
	const isAssignableToZero = tsst.isAssignableToValue(simpleType, 0);
	const isAssignableToNaN = tsst.isAssignableToValue(simpleType, NaN);
	const isAssignableToEmptyString = tsst.isAssignableToValue(simpleType, "");
	return isAssignableToZero || isAssignableToNaN || isAssignableToEmptyString;
}

export function wrapConditional(state: TransformState, exp: lua.Expression, nodeType: ts.Type) {
	const checks = new Array<lua.Expression>();

	const simpleType = tsst.toSimpleType(nodeType, state.typeChecker);
	const isAssignableToZero = tsst.isAssignableToValue(simpleType, 0);
	const isAssignableToNaN = tsst.isAssignableToValue(simpleType, NaN);
	const isAssignableToEmptyString = tsst.isAssignableToValue(simpleType, "");

	if (isAssignableToZero || isAssignableToNaN || isAssignableToEmptyString) {
		exp = pushToVarIfComplex(state, exp);
	}

	if (isAssignableToZero) {
		checks.push(
			lua.create(lua.SyntaxKind.BinaryExpression, {
				left: exp,
				operator: lua.BinaryOperator.TildeEqual,
				right: lua.create(lua.SyntaxKind.NumberLiteral, { value: 0 }),
			}),
		);
	}

	if (isAssignableToNaN) {
		checks.push(
			lua.create(lua.SyntaxKind.BinaryExpression, {
				left: exp,
				operator: lua.BinaryOperator.EqualEqual,
				right: exp,
			}),
		);
	}

	if (isAssignableToEmptyString) {
		checks.push(
			lua.create(lua.SyntaxKind.BinaryExpression, {
				left: exp,
				operator: lua.BinaryOperator.TildeEqual,
				right: lua.create(lua.SyntaxKind.StringLiteral, { value: "" }),
			}),
		);
	}

	checks.push(exp);

	return binaryExpressionChain(checks, lua.BinaryOperator.And);
}
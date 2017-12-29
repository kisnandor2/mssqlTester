::Create the databases
sqlcmd -i vizsga3.sql

::Rerun the solver and get the output in files
sqlcmd -i vizsga3_solver.sql -o vizsga3_solved.txt /d vizsga3
